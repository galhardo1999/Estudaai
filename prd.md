Plataforma de Estudos Inteligente (EstudosAI)

1. Visão Geral do Produto

Uma aplicação web onde estudantes de concursos podem centralizar seus materiais (PDFs, editais, apostilas), permitindo que uma IA analise o conteúdo para gerar resumos, simulados personalizados com cronômetro e análises de desempenho detalhadas.

2. Público-Alvo

Candidatos a concursos públicos.

Estudantes universitários.

Pesquisadores que precisam sintetizar grandes volumes de documentos.

3. Stack Tecnológica

Frontend: Next.js (App Router), TailwindCSS.

Backend: Next.js Server Actions / API Routes.

Banco de Dados: PostgreSQL com Prisma ORM.

IA: Google Gemini 1.5 Pro API (via Google AI Studio ou Vertex AI).

Armazenamento de Arquivos: Supabase Storage ou AWS S3 (para os PDFs).

4. Requisitos Funcionais (RF)

RF01: Gestão de Documentos (Sidebar Esquerda)

O usuário deve poder fazer upload de múltiplos arquivos (PDF, TXT).

O sistema deve listar os documentos ativos para a sessão de estudo.

Status: Essencial.

RF02: Resumo Inteligente

A IA deve processar os documentos selecionados e gerar um resumo estruturado.

O resumo deve destacar pontos-chave comuns em editais de concursos.

RF03: Gerador de Simulados (Provas)

O usuário define a quantidade de questões ($X$).

A IA gera questões de múltipla escolha baseadas estritamente no conteúdo enviado.

Cronômetro: O sistema deve exibir um tempo regressivo baseado na dificuldade/quantidade de questões.

RF04: Correção e Feedback

Ao finalizar, o sistema compara as respostas.

Deve apresentar um "Dashboard de Erros" explicando por que a alternativa escolhida estava incorreta com base no texto da fonte.

5. Arquitetura de Dados (Prisma Schema)

Snippet de código

// Exemplo simplificado de estrutura
model Usuario {
  id        String   @id @default(uuid())
  nome      String
  cpf       String   @unique
  email     String   @unique
  senha     String     
  dataNascimento DateTime
  telefone  String
  genero    String
  documentos Documentos[]
  exames     Exames[]
}

model Documento {
  id        String   @id @default(uuid())
  titulo     String
  descricao String
  url       String   // Link para o storage
  usuarioId    String
  usuario      Usuario     @relation(fields: [usuarioId], references: id)
}

model Exame {
  id          String   @id @default(uuid())
  pontuacao       Int
  
  totalQuestoes Int
  duracao    Int      // Tempo gasto em segundos
  criadoEm   DateTime @default(now())
  usuarioId      String
  usuario        Usuario     @relation(fields: [usuarioId], references: id)
}
6. Requisitos Não Funcionais (RNF)

Performance: A análise inicial dos documentos deve utilizar Context Caching para reduzir a latência em perguntas subsequentes.

Segurança: Documentos de um usuário não podem ser acessíveis por outros.

Usabilidade: Interface responsiva e modo escuro (Dark Mode) para longas horas de estudo.

7. Fluxo do Usuário (User Flow)

Login/Signup: Usuário acessa via NextAuth.

Upload: Usuário arrasta PDFs para a barra lateral.

Processamento: O backend extrai o texto e envia para o Gemini.

Seleção de Ação: O usuário clica em "Gerar Simulado".

Execução: O cronômetro inicia; o usuário responde às questões.

Resultado: O sistema salva o desempenho no PostgreSQL via Prisma e exibe o feedback.

Para tornar seu negócio viável, você deve usar o que chamamos de Roteamento de Modelos e Context Caching.

Aqui está o plano financeiro para o seu sistema:

1. A Estratégia dos "Dois Modelos"

Não use o Gemini 1.5 Pro para tudo. No seu PRD, divida as tarefas entre o modelo "Cérebro" (Pro) e o modelo "Operário" (Flash):

Funcionalidade	Modelo Sugerido	Por que?
Análise Inicial/Resumo	Gemini 1.5 Pro	Exige alta capacidade de síntese e visão geral do documento.
Gerar Questões	Gemini 1.5 Flash	Questões são tarefas repetitivas. O Flash é ~15x mais barato e muito rápido.
Chat de Dúvidas	Gemini 1.5 Flash	Respostas curtas e rápidas economizam milhares de tokens por dia.
Correção de Prova	Gemini 1.5 Flash	Comparar resposta A com B não exige um "supercérebro".

2. Context Caching: A Chave do Lucro

O maior custo em apps de estudo é que o usuário envia o mesmo PDF de 50MB toda vez que faz uma pergunta. No modelo tradicional, você pagaria os tokens desse PDF em cada interação.

Com o Context Caching do Google:

Você envia o arquivo uma vez e "congela" ele no cache.

Você paga uma taxa pequena de armazenamento por hora (cerca de US$ 1.00 por 1 milhão de tokens por hora).

As perguntas subsequentes do usuário não pagam pelos tokens do documento original, apenas pelos tokens da pergunta nova.

Resultado: Economia de até 90% nos custos de entrada.

3. Simulação de Custos (Exemplo Real em 2026)

Imagine um usuário que sobe um material de 100.000 tokens (aprox. 150 páginas).

Sem Cache (Gemini 1.5 Pro): Se ele fizer 10 perguntas, você paga $10 \times 100.000$ tokens = 1 milhão de tokens ($\approx$ US$ 1.25).

Com Cache (Gemini 1.5 Pro): Você paga os 100.000 uma vez + taxa de hora. Se as 10 perguntas forem feitas em 1 hora, você paga $\approx$ US$ 0.15.

4. Como cobrar do seu cliente?

Para o sistema ser sustentável, você pode usar dois modelos de negócio:

Plano Freemium: Ofereça o modelo Gemini 1.5 Flash (que tem uma cota gratuita generosa no Google AI Studio) com limites de upload.

Plano Premium: Libere o Gemini 1.5 Pro para resumos mais profundos e uploads maiores, cobrando uma assinatura que cubra os custos de API (ex: R$ 29,90/mês cobre tranquilamente o uso intenso de um estudante médio).