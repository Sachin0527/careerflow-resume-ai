import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/firebase.js', () => ({ db: {} }));

const { createVersion, getCurrent, undo, redo, list, compare } = await import(
  '../src/services/versioning.js'
);

/**
 * Minimal in-memory Firestore mock supporting collections, subcollections, orderBy, and runTransaction.
 */
function createMockFirestore() {
  const store = new Map();
  let autoId = 0;

  function makeDocRef(path) {
    return {
      id: path.split('/').pop(),
      path,
      collection(sub) {
        return makeCollectionRef(`${path}/${sub}`);
      },
      async get() {
        const val = store.get(path);
        return {
          id: path.split('/').pop(),
          exists: val !== undefined,
          data: () => (val ? structuredClone(val) : undefined),
        };
      },
      async set(data) {
        store.set(path, structuredClone(data));
      },
      async update(updates) {
        const existing = store.get(path) || {};
        store.set(path, structuredClone({ ...existing, ...updates }));
      },
    };
  }

  function makeCollectionRef(colPath) {
    return {
      doc(id) {
        const docId = id || `doc-${++autoId}`;
        return makeDocRef(`${colPath}/${docId}`);
      },
      orderBy(field, dir = 'asc') {
        return {
          async get() {
            const prefix = `${colPath}/`;
            const docs = [];
            for (const [key, value] of store.entries()) {
              if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
                docs.push({
                  id: key.slice(prefix.length),
                  data: () => structuredClone(value),
                });
              }
            }
            docs.sort((a, b) => {
              const av = a.data()[field];
              const bv = b.data()[field];
              return dir === 'desc' ? bv - av : av - bv;
            });
            return { docs };
          },
        };
      },
    };
  }

  return {
    collection: (name) => makeCollectionRef(name),
    async runTransaction(fn) {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data) => ref.set(data),
        update: (ref, data) => ref.update(data),
      };
      return fn(tx);
    },
    seedConversation(id, data = {}) {
      store.set(`conversations/${id}`, {
        title: 'Test',
        currentVersionId: null,
        versionStack: [],
        redoStack: [],
        latestVersionNumber: 0,
        ...data,
      });
    },
  };
}

const makeResume = (summary) => ({
  basics: { name: 'Alex', email: '', phone: '', location: '', links: [], summary },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  extraSections: [],
  meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
});

describe('services/versioning', () => {
  it('creates versions, undoes, redoes, lists without resume body, and compares', async () => {
    const mockDb = createMockFirestore();
    mockDb.seedConversation('conv-1');

    const v1 = await createVersion(
      { conversationId: 'conv-1', resume: makeResume('v1 summary'), createdBy: 'upload' },
      mockDb
    );
    expect(v1.versionNumber).toBe(1);
    expect(v1.canUndo).toBe(false);

    const v2 = await createVersion(
      { conversationId: 'conv-1', resume: makeResume('v2 summary'), createdBy: 'sectionAgent' },
      mockDb
    );
    expect(v2.versionNumber).toBe(2);
    expect(v2.canUndo).toBe(true);

    const afterUndo = await undo('conv-1', mockDb);
    expect(afterUndo.version.id).toBe(v1.id);
    expect(afterUndo.canUndo).toBe(false);
    expect(afterUndo.canRedo).toBe(true);

    await expect(undo('conv-1', mockDb)).rejects.toThrow(/Nothing to undo/);

    const afterRedo = await redo('conv-1', mockDb);
    expect(afterRedo.version.id).toBe(v2.id);
    expect(afterRedo.canRedo).toBe(false);

    const current = await getCurrent('conv-1', mockDb);
    expect(current.resume.basics.summary).toBe('v2 summary');

    const versionsList = await list('conv-1', mockDb);
    expect(versionsList).toHaveLength(2);
    expect(versionsList[0].resume).toBeUndefined();
    expect(versionsList[0].isCurrent).toBe(true);

    const diff = await compare('conv-1', v1.id, v2.id, mockDb);
    expect(diff.changedSections).toEqual(['basics']);
  });

  it('supports multi-step undo/redo and clears redoStack when branching with a new version', async () => {
    const mockDb = createMockFirestore();
    mockDb.seedConversation('conv-2');

    const v1 = await createVersion(
      { conversationId: 'conv-2', resume: makeResume('v1'), createdBy: 'upload' },
      mockDb
    );
    const v2 = await createVersion(
      { conversationId: 'conv-2', resume: makeResume('v2'), createdBy: 'companyAgent' },
      mockDb
    );
    const v3 = await createVersion(
      { conversationId: 'conv-2', resume: makeResume('v3'), createdBy: 'translationAgent' },
      mockDb
    );

    const u1 = await undo('conv-2', mockDb);
    expect(u1.version.id).toBe(v2.id);
    expect(u1.canUndo).toBe(true);
    expect(u1.canRedo).toBe(true);

    const u2 = await undo('conv-2', mockDb);
    expect(u2.version.id).toBe(v1.id);
    expect(u2.canUndo).toBe(false);
    expect(u2.canRedo).toBe(true);

    const r1 = await redo('conv-2', mockDb);
    expect(r1.version.id).toBe(v2.id);
    expect(r1.canRedo).toBe(true);

    // Branching with v4 after undo must clear redoStack (v3 no longer redoable)
    const v4 = await createVersion(
      { conversationId: 'conv-2', resume: makeResume('v4'), createdBy: 'sectionAgent' },
      mockDb
    );
    expect(v4.versionNumber).toBe(4);
    expect(v4.canUndo).toBe(true);
    expect(v4.canRedo).toBe(false);

    await expect(redo('conv-2', mockDb)).rejects.toThrow(/Nothing to redo/);

    const afterV4Undo = await undo('conv-2', mockDb);
    expect(afterV4Undo.version.id).toBe(v2.id);
    const afterV4Redo = await redo('conv-2', mockDb);
    expect(afterV4Redo.version.id).toBe(v4.id);
    expect(v3.versionNumber).toBe(3);
  });
});
