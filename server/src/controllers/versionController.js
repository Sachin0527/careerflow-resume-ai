import * as versioningService from '../services/versioning.js';

export async function listVersions(req, res, next) {
  try {
    const versions = await versioningService.list(req.params.id);
    res.json({ versions });
  } catch (err) {
    next(err);
  }
}

export async function getVersion(req, res, next) {
  try {
    const version = await versioningService.getVersion(req.params.id, req.params.vid);
    res.json({ version });
  } catch (err) {
    next(err);
  }
}

export async function undoVersion(req, res, next) {
  try {
    const result = await versioningService.undo(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function redoVersion(req, res, next) {
  try {
    const result = await versioningService.redo(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function compareVersions(req, res, next) {
  try {
    const comparison = await versioningService.compare(
      req.params.id,
      req.query.from,
      req.query.to
    );
    res.json(comparison);
  } catch (err) {
    next(err);
  }
}

export async function restoreVersion(req, res, next) {
  try {
    const result = await versioningService.restoreVersion(req.params.id, req.params.vid);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
