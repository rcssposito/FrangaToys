import { z } from 'zod';

export const FiguraSchema = z.object({
  id: z.number(),
  nome: z.string(),
  codigo: z.string().nullable().optional(),
  imagem_url: z.string().nullable(),
  disponivel: z.boolean(),
  studio_id: z.number().nullable(),
  serie_id: z.number().nullable(),
  // Joined fields
  serie: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  studio: z.string().nullable().optional(),
  studio_logo: z.string().nullable().optional(),
  studio_instagram: z.string().nullable().optional(),
  studio_social: z.string().nullable().optional(),
  // Meta fields (joined or null)
  altura_cm: z.number().nullable().optional(),
  largura_cm: z.number().nullable().optional(),
  profundidade_cm: z.number().nullable().optional(),
  resina_kg: z.number().nullable().optional(),
  horas_impressao: z.number().nullable().optional(),
  horas_pintura: z.number().nullable().optional(),
  slug: z.string().nullable().optional(),
  preco: z.number().nullable().optional(),
  is_campanha: z.boolean().nullable().optional(),
  is_campanha_active: z.boolean().nullable().optional(),
  desconto_campanha: z.number().nullable().optional(),
  preco_fixo_campanha: z.number().nullable().optional(),
  precos: z.object({
    estilizado: z.number(),
    colorido: z.number(),
    premium: z.number(),
    pix_estilizado: z.number().optional(),
    pix_colorido: z.number().optional(),
    pix_premium: z.number().optional(),
  }).optional(),
  tem_extras: z.boolean().nullable().optional(),
  tem_pintura_real: z.boolean().nullable().optional(),
  is_merchant: z.boolean().optional().default(false),
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
  sort: z.string().optional(),
  priceRange: z.string().optional(),
  sizeRange: z.string().optional(),
});

export const EstudioSchema = z.object({
  id: z.number(),
  nome: z.string(),
  custo_mensal: z.number().nullable().optional(),
  qtd_display: z.number().nullable().optional(),
  qualidade: z.number().nullable().optional(),
  observacao: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  instagram_handle: z.string().nullable().optional(),
  social_url: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
  merchant: z.boolean().optional().default(false),
  figuras: z.array(z.object({ count: z.number() })).optional(),
});
