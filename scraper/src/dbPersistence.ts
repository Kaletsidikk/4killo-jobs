import { PrismaClient, ExperienceLevel, SourceType } from '@prisma/client';
import { CanonicalJob, IngestedInput } from './deduplicator';

/**
 * 4KILLO Database Persistence Layer
 * 
 * Persists deduplicated canonical jobs and multi-channel provenance
 * directly into Eden's PostgreSQL/Supabase database.
 */

export class DatabasePersistence {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Upserts the channel/website source in the Source table
   */
  public async ensureSource(identifier: string, name?: string): Promise<string> {
    const isWeb = identifier.startsWith('web:');
    const cleanIdentifier = identifier.replace(/^@/, '');
    const defaultName = name || (isWeb ? identifier.replace('web:', '') : cleanIdentifier);

    const source = await this.prisma.source.upsert({
      where: { identifier: cleanIdentifier },
      update: {
        lastSyncAt: new Date(),
        totalJobsScraped: { increment: 1 },
      },
      create: {
        identifier: cleanIdentifier,
        name: defaultName,
        type: isWeb ? SourceType.WEBSITE : SourceType.TELEGRAM_CHANNEL,
        lastSyncAt: new Date(),
        totalJobsScraped: 1,
      },
    });

    return source.id;
  }

  /**
   * Persists a canonical job and its provenance source into PostgreSQL
   */
  public async persistJob(
    canonical: CanonicalJob,
    input: IngestedInput,
    status: 'CREATED' | 'MERGED'
  ): Promise<void> {
    try {
      const sourceId = await this.ensureSource(input.sourceChannel);

      const expLevel = this.mapExperienceLevel(canonical.experienceLevel);
      const deadlineDate = this.parseDate(canonical.deadline);
      const postedAtDate = this.parseDate(input.scrapedAt) || new Date();

      if (status === 'CREATED') {
        // 1. Insert new Job
        await this.prisma.job.upsert({
          where: { id: canonical.id },
          update: {
            title: canonical.title,
            company: canonical.company,
            location: canonical.location || 'Addis Ababa, Ethiopia',
            category: canonical.category || 'General Vacancies',
            employmentType: canonical.employmentType || 'Full-time',
            experienceLevel: expLevel,
            education: canonical.education || null,
            salary: canonical.salary || 'Negotiable',
            deadline: deadlineDate,
            description: canonical.description,
            requirements: canonical.requirements || null,
            applyUrl: canonical.applyUrl || null,
            applyEmail: canonical.applyEmail || null,
            applyPhone: canonical.applyPhone || null,
            isDirectContact: canonical.isDirectContact || false,
            isActive: true,
          },
          create: {
            id: canonical.id,
            title: canonical.title,
            company: canonical.company,
            location: canonical.location || 'Addis Ababa, Ethiopia',
            category: canonical.category || 'General Vacancies',
            employmentType: canonical.employmentType || 'Full-time',
            experienceLevel: expLevel,
            education: canonical.education || null,
            salary: canonical.salary || 'Negotiable',
            deadline: deadlineDate,
            description: canonical.description,
            requirements: canonical.requirements || null,
            applyUrl: canonical.applyUrl || null,
            applyEmail: canonical.applyEmail || null,
            applyPhone: canonical.applyPhone || null,
            isDirectContact: canonical.isDirectContact || false,
            isActive: true,
          },
        });
      } else {
        // 2. On MERGED: Update existing job with richer fields
        await this.prisma.job.update({
          where: { id: canonical.id },
          data: {
            description: canonical.description,
            requirements: canonical.requirements || undefined,
            applyUrl: canonical.applyUrl || undefined,
            applyEmail: canonical.applyEmail || undefined,
            applyPhone: canonical.applyPhone || undefined,
            isDirectContact: canonical.isDirectContact || undefined,
            deadline: deadlineDate || undefined,
          },
        });
      }

      // 3. Upsert JobSource record for this specific post/message (multi-channel provenance)
      await this.prisma.jobSource.upsert({
        where: { postUrl: input.postUrl },
        update: {
          rawText: input.job.description || input.job.title,
        },
        create: {
          jobId: canonical.id,
          sourceId: sourceId,
          sourceName: input.sourceChannel,
          messageId: input.sourceMessageId || null,
          postUrl: input.postUrl,
          rawText: input.job.description || input.job.title,
          postedAt: postedAtDate,
        },
      });

      console.log(`[DB] Successfully persisted job "${canonical.title}" (${status}) with provenance: ${input.postUrl}`);
    } catch (err: any) {
      console.error(`[DB] Failed to persist job "${canonical.title}" to PostgreSQL:`, err?.message || err);
    }
  }

  private mapExperienceLevel(level: string | null | undefined): ExperienceLevel {
    if (!level) return ExperienceLevel.NOT_SPECIFIED;
    const upper = level.toUpperCase();
    if (upper === 'ENTRY') return ExperienceLevel.ENTRY;
    if (upper === 'JUNIOR') return ExperienceLevel.JUNIOR;
    if (upper === 'MID') return ExperienceLevel.MID;
    if (upper === 'SENIOR') return ExperienceLevel.SENIOR;
    return ExperienceLevel.NOT_SPECIFIED;
  }

  private parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
