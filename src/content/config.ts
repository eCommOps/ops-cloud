import { defineCollection, z } from 'astro:content';

const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['ai', 'automation', 'data', 'productivity', 'development']),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    icon: z.string().optional(),
    status: z.enum(['active', 'beta', 'coming-soon']).default('active'),
    launchDate: z.date().optional(),
  }),
});

export const collections = {
  tools: toolsCollection,
};
