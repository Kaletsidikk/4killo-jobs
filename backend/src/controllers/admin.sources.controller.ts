import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SourceType } from '@prisma/client';

export const getSources = async (req: Request, res: Response): Promise<any> => {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return res.status(500).json({ error: 'Failed to fetch sources' });
  }
};

export const addSource = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, identifier, type } = req.body;

    if (!name || !identifier) {
      return res.status(400).json({ error: 'Name and identifier are required' });
    }

    const sourceType = type || SourceType.TELEGRAM_CHANNEL;

    const existingSource = await prisma.source.findUnique({
      where: { identifier },
    });

    if (existingSource) {
      return res.status(409).json({ error: 'Source with this identifier already exists' });
    }

    const source = await prisma.source.create({
      data: {
        name,
        identifier,
        type: sourceType,
      },
    });

    return res.status(201).json(source);
  } catch (error) {
    console.error('Error adding source:', error);
    return res.status(500).json({ error: 'Failed to add source' });
  }
};
