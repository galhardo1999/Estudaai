export interface Concurso {
  id: string
  nome: string
  sigla: string
  nivel: "Médio" | "Superior" | "Técnico"
  banca: string
  orgao: string
  descricao: string
  disciplinas: string[]
  imagemUrl: string
  destaque: boolean
  salarioBase: string
}

export const concursos: Concurso[] = [
  {
    id: "pf",
    nome: "Polícia Federal",
    sigla: "PF",
    nivel: "Superior",
    banca: "Cebraspe",
    orgao: "Ministério da Justiça",
    descricao:
      "Um dos concursos mais concorridos do Brasil. O cargo de Agente exige nível superior em qualquer área.",
    disciplinas: [
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Legislação Especial",
      "Contabilidade",
      "Informática",
      "Raciocínio Lógico",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=400&q=80",
    destaque: true,
    salarioBase: "R$ 23.000",
  },
  {
    id: "prf",
    nome: "Polícia Rodoviária Federal",
    sigla: "PRF",
    nivel: "Superior",
    banca: "Cebraspe",
    orgao: "Ministério da Justiça",
    descricao:
      "Concurso para policiamento das rodovias federais. Exige nível superior em qualquer área de formação.",
    disciplinas: [
      "Legislação de Trânsito",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direitos Humanos",
      "Física Aplicada",
      "Informática",
      "Geopolítica Brasileira",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80",
    destaque: true,
    salarioBase: "R$ 12.500",
  },
  {
    id: "inss",
    nome: "INSS",
    sigla: "INSS",
    nivel: "Médio",
    banca: "Cebraspe",
    orgao: "Previdência Social",
    descricao:
      "Concurso para Técnico do Seguro Social. Uma das melhores opções para quem tem nível médio.",
    disciplinas: [
      "Direito Previdenciário",
      "Direito Constitucional",
      "Direito Administrativo",
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Ética no Serviço Público",
      "Legislação Previdenciária",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80",
    destaque: true,
    salarioBase: "R$ 7.500",
  },
  {
    id: "receita-federal",
    nome: "Receita Federal",
    sigla: "RFB",
    nivel: "Superior",
    banca: "FGV",
    orgao: "Ministério da Fazenda",
    descricao:
      "Concurso para Auditor-Fiscal. Um dos maiores salários iniciais do serviço público federal.",
    disciplinas: [
      "Direito Tributário",
      "Contabilidade Geral",
      "Legislação Tributária",
      "Direito Constitucional",
      "Direito Administrativo",
      "Comércio Internacional",
      "Auditoria",
      "Economia",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=400&q=80",
    destaque: true,
    salarioBase: "R$ 21.000",
  },
  {
    id: "banco-brasil",
    nome: "Banco do Brasil",
    sigla: "BB",
    nivel: "Médio",
    banca: "Cesgranrio",
    orgao: "Banco do Brasil S.A.",
    descricao:
      "Concurso para Escriturário. Porta de entrada para carreira bancária com boas perspectivas.",
    disciplinas: [
      "Conhecimentos Bancários",
      "Língua Portuguesa",
      "Matemática Financeira",
      "Raciocínio Lógico",
      "Informática",
      "Atualidades do Mercado Financeiro",
      "Língua Inglesa",
      "Probabilidade e Estatística",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400&q=80",
    destaque: true,
    salarioBase: "R$ 5.400",
  },
  {
    id: "caixa",
    nome: "Caixa Econômica Federal",
    sigla: "CEF",
    nivel: "Médio",
    banca: "Cesgranrio",
    orgao: "Caixa Econômica Federal",
    descricao:
      "Concurso para Técnico Bancário. Grande número de vagas e presença em todo o território nacional.",
    disciplinas: [
      "Conhecimentos Bancários",
      "Matemática Financeira",
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Atualidades",
      "Legislação Específica",
      "Ética",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80",
    destaque: false,
    salarioBase: "R$ 4.000",
  },
  {
    id: "tribunais",
    nome: "Tribunais",
    sigla: "TRT / TJ / TRF",
    nivel: "Superior",
    banca: "FCC",
    orgao: "Poder Judiciário",
    descricao:
      "Concursos para os Tribunais de Justiça, Trabalho e Regionais Federais. Estabilidade e bons salários.",
    disciplinas: [
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Processual Civil",
      "Direito do Trabalho",
      "Direito Processual do Trabalho",
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Administração Pública",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80",
    destaque: true,
    salarioBase: "R$ 13.000",
  },
  {
    id: "militares",
    nome: "Concursos Militares",
    sigla: "EB / FAB / BM",
    nivel: "Médio",
    banca: "Diversas",
    orgao: "Forças Armadas / Bombeiros",
    descricao:
      "Concursos para Exército, Aeronáutica e Bombeiros Militares. Carreira com progressão e benefícios.",
    disciplinas: [
      "Matemática",
      "Língua Portuguesa",
      "Física",
      "Química",
      "Geografia",
      "História do Brasil",
      "Língua Inglesa",
      "Raciocínio Lógico",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1579912437766-7896df6d3cd3?w=400&q=80",
    destaque: false,
    salarioBase: "R$ 3.800",
  },
  {
    id: "agu",
    nome: "AGU / PFN / PGFN",
    sigla: "AGU",
    nivel: "Superior",
    banca: "Cebraspe",
    orgao: "Advocacia-Geral da União",
    descricao:
      "Concurso para Advogado da União e Procurador. Requer graduação em Direito e aprovação na OAB.",
    disciplinas: [
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Tributário",
      "Direito Internacional",
      "Direito do Trabalho",
      "Direito Financeiro",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&q=80",
    destaque: false,
    salarioBase: "R$ 22.000",
  },
  {
    id: "mpu-dpu",
    nome: "MPU / DPU",
    sigla: "MPU / DPU",
    nivel: "Superior",
    banca: "Cebraspe",
    orgao: "Ministério Público da União",
    descricao:
      "Concursos para Analista e Técnico do MPU e DPU. Excelentes condições de trabalho e remuneração.",
    disciplinas: [
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Legislação do MPU",
      "Administração",
      "Informática",
    ],
    imagemUrl:
      "https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?w=400&q=80",
    destaque: false,
    salarioBase: "R$ 13.000",
  },
]
