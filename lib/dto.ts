import { z } from 'zod';

export const FiguraSchema = z.object({
  id: z.number(),
  nome: z.string(),
  imagem_url: z.string().nullable(),
  disponivel: z.boolean(),
  studio_id: z.number().nullable(),
  serie_id: z.number().nullable(),
  // Joined fields
  serie: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  studio: z.string().nullable().optional(),
  // Meta fields (joined or null)
  altura_cm: z.number().nullable().optional(),
  largura_cm: z.number().nullable().optional(),
  profundidade_cm: z.number().nullable().optional(),
  slug: z.string().nullable().optional(),
  preco: z.number().nullable().optional(),
  tem_extras: z.boolean().nullable().optional(),
});

export type FiguraDTO = z.infer<typeof FiguraSchema>;

export const FiltersSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  studioIds: z.string().optional(), // '1,2,3'
  incluirNaoVendaveis: z.string().optional(), // 'true' or 'false'
  novidades: z.string().optional(), // 'true' or 'false'
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const EstudioSchema = z.object({
  id: z.number(),
  nome: z.string(),
  custo_mensal: z.number().nullable().optional(),
  qtd_display: z.number().nullable().optional(),
  qualidade: z.number().nullable().optional(),
  observacao: z.string().nullable().optional(),
  figuras: z.array(z.object({ count: z.number() })).optional(),
});
