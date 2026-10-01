import { Router } from 'express';
import { getPublicSources, getPublicSourceById } from '../controllers/sources.controller';

const router = Router();

// GET /api/sources     — List active sources
router.get('/', getPublicSources);

// GET /api/sources/:id — Get a single source's public information
router.get('/:id', getPublicSourceById);

export default router;
