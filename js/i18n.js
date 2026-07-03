// MyFinance — i18n (display language)
// English is the source language AND the dictionary key: t('Net Worth') returns the active
// language's translation, falling back to the English key itself when missing. Language is a
// per-device display preference (localStorage), code and data stay English.

const DICT = {
  pt: {
    // --- auth / app shell ---
    'Email': 'Email',
    'Password': 'Palavra-passe',
    'Sign In': 'Iniciar Sessão',
    'Sign Out': 'Terminar Sessão',
    'Dashboard': 'Dashboard',
    'Data': 'Dados',
    'Settings': 'Definições',
    'Dashboards': 'Painéis',
    'Toggle menu': 'Alternar menu',
    'Collapse / expand menu': 'Recolher / expandir menu',
    'Add / manage data': 'Adicionar / gerir dados',
    'Default categories': 'Categorias predefinidas',
    'Categories': 'Categorias',
    'Help & FAQ': 'Ajuda e FAQ',
    'Unknown view.': 'Vista desconhecida.',

    // --- sidebar / pages / folders ---
    'Page': 'Página',
    'Folder': 'Pasta',
    'New page': 'Nova página',
    'New folder': 'Nova pasta',
    'Edit folder': 'Editar pasta',
    'Page options': 'Opções da página',
    'Folder options': 'Opções da pasta',
    'Icon': 'Ícone',
    '— None (top level) —': '— Nenhuma (nível de topo) —',
    'Delete this page?': 'Eliminar esta página?',
    'Delete this folder? Its pages move to the top level (not deleted).':
      'Eliminar esta pasta? As suas páginas passam para o nível de topo (não são eliminadas).',
    'e.g. Home': 'ex.: Casa',
    'Blank page': 'Página em branco',
    'Start from scratch': 'Começar do zero',
    '{n} widgets': '{n} widgets',
    'Could not add page': 'Não foi possível adicionar a página',
    'No dashboard yet. Use “+ Page” in the sidebar to create one.':
      'Ainda não há dashboards. Use “+ Página” na barra lateral para criar um.',

    // --- dashboard edit mode / engine ---
    'Edit': 'Editar',
    'Done': 'Concluído',
    'Widget': 'Widget',
    'Widgets': 'Widgets',
    'Remove': 'Remover',
    'Widget error': 'Erro no widget',
    'Editing — drag to move, use the handles to resize': 'A editar — arraste para mover, use as pegas para redimensionar',
    'Drag to resize': 'Arraste para redimensionar',
    'Save failed': 'Falha ao guardar',
    'Delete failed': 'Falha ao eliminar',

    // --- widget library ---
    'Widget library': 'Biblioteca de widgets',
    'All': 'Todos',
    'Add': 'Adicionar',
    'Add to page': 'Adicionar à página',
    'Back': 'Voltar',
    'Close': 'Fechar',
    'More info': 'Mais informação',
    'Minimum size': 'Tamanho mínimo',
    'Solo widget': 'Widget individual',
    'Per-person widget': 'Widget por pessoa',
    'Preview unavailable': 'Pré-visualização indisponível',
    'No widgets match this filter.': 'Nenhum widget corresponde a este filtro.',
    'Needs 2+ profiles — add them in Settings.': 'Requer 2+ perfis — adicione-os nas Definições.',
    'This widget compares people, so it needs at least 2 profiles — add them in Settings.':
      'Este widget compara pessoas, por isso precisa de pelo menos 2 perfis — adicione-os nas Definições.',
    'Add 2+ profiles (Settings) to use this.': 'Adicione 2+ perfis (Definições) para usar isto.',

    // widget tags (frozen taxonomy)
    'chart': 'gráfico',
    'line': 'linha',
    'bars': 'barras',
    'pie': 'circular',
    'card': 'cartão',
    'list': 'lista',
    'gauge': 'medidor',
    'heatmap': 'mapa de calor',
    'net worth': 'património',
    'spending': 'despesas',
    'earnings': 'receitas',
    'subscriptions': 'subscrições',
    'accounts': 'contas',
    'stocks': 'ações',
    'budget': 'orçamento',
    'people': 'pessoas',
    'transactions': 'transações',

    // --- widget titles ---
    'Net Worth': 'Património Líquido',
    'Cash Flow · this month': 'Fluxo de Caixa · este mês',
    'Top Spending · this month': 'Principais despesas · este mês',
    'Net Worth · 6 months': 'Património Líquido · 6 meses',
    'Savings Rate': 'Taxa de Poupança',
    'Accounts': 'Contas',
    'Recent transactions': 'Transações recentes',
    'Income vs Expenses · 6 months': 'Receitas vs Despesas · 6 meses',
    'Portfolio': 'Portefólio',
    'Holdings': 'Posições',
    'Spending by category': 'Despesas por categoria',
    'Income by category': 'Receitas por categoria',
    'Net by month · 12 months': 'Líquido por mês · 12 meses',
    'This month vs last': 'Este mês vs o passado',
    'Daily spend · cumulative': 'Despesa diária · acumulada',
    'Spending by weekday': 'Despesas por dia da semana',
    'Balance by account': 'Saldo por conta',
    'Avg daily spend': 'Despesa média diária',
    'Cash vs invested': 'Dinheiro vs investido',
    'Savings goal': 'Objetivo de poupança',
    'Biggest expenses': 'Maiores despesas',
    'Top merchants': 'Principais comerciantes',
    'Subscriptions': 'Subscrições',
    'Stock movers': 'Variações das ações',
    'Spending by person · this month': 'Despesas por pessoa · este mês',
    'Net by person · this month': 'Líquido por pessoa · este mês',
    'Income by person · this month': 'Receitas por pessoa · este mês',
    'Spending by person · 6 months': 'Despesas por pessoa · 6 meses',

    // --- widget descriptions ---
    'Your total net worth (accounts plus portfolio) with the change versus last month and a 6-month sparkline.':
      'O seu património líquido total (contas mais portefólio), com a variação face ao mês passado e um mini-gráfico de 6 meses.',
    "This month's income, expenses, net result and savings rate at a glance.":
      'As receitas, despesas, resultado líquido e taxa de poupança deste mês, num relance.',
    "Your top expense categories this month as horizontal bars, using each category's colour.":
      'As suas principais categorias de despesa este mês, em barras horizontais, com a cor de cada categoria.',
    'Net worth month by month over the last 6 months, as a filled line chart.':
      'Património líquido mês a mês nos últimos 6 meses, num gráfico de linha preenchido.',
    "The share of this month's income you kept: (income − expenses) / income.":
      'A parte da receita deste mês que guardou: (receitas − despesas) / receitas.',
    'Every account with its current balance (initial balance plus all transactions).':
      'Cada conta com o seu saldo atual (saldo inicial mais todas as transações).',
    'Your latest transactions with category icon, description and signed amount.':
      'As suas transações mais recentes, com o ícone da categoria, descrição e montante com sinal.',
    'Monthly income and expense totals side by side for the last 6 months.':
      'Totais mensais de receitas e despesas, lado a lado, nos últimos 6 meses.',
    'Current portfolio value at the latest prices, with total gain versus purchase cost.':
      'Valor atual do portefólio aos preços mais recentes, com o ganho total face ao custo de compra.',
    'Each holding with its current value and gain since purchase.':
      'Cada posição com o seu valor atual e ganho desde a compra.',
    "A donut splitting this month's expenses across categories, using each category's colour.":
      'Um gráfico circular que divide as despesas deste mês por categoria, com a cor de cada uma.',
    "A donut splitting this month's income across categories (salary, freelance, ...).":
      'Um gráfico circular que divide as receitas deste mês por categoria (salário, freelance, ...).',
    'Monthly net result (income minus expenses) for the last 12 months; positive months in the accent colour, negative in red.':
      'Resultado líquido mensal (receitas menos despesas) dos últimos 12 meses; meses positivos na cor de destaque, negativos a vermelho.',
    'Grouped bars comparing income and expenses between last month and this month.':
      'Barras agrupadas que comparam receitas e despesas entre o mês passado e este mês.',
    "Cumulative spending day by day: this month (accent) plotted against last month (grey) so you can see if you're ahead or behind.":
      'Despesa acumulada dia a dia: este mês (cor de destaque) sobreposto ao mês passado (cinzento), para ver se está adiantado ou atrasado.',
    'Average amount spent on each weekday over the last 8 weeks — spot your expensive days.':
      'Montante médio gasto em cada dia da semana nas últimas 8 semanas — descubra os seus dias mais caros.',
    'A donut showing how your cash is split across accounts (positive balances only).':
      'Um gráfico circular que mostra como o seu dinheiro está dividido pelas contas (apenas saldos positivos).',
    "This month's expenses divided by the days elapsed so far.":
      'As despesas deste mês divididas pelos dias já decorridos.',
    'How your net worth splits between account cash and portfolio value, with a proportion bar.':
      'Como o seu património se divide entre dinheiro em contas e valor do portefólio, com uma barra de proporção.',
    "Progress toward a 20% savings-rate target, based on this month's income and expenses.":
      'Progresso rumo a um objetivo de 20% de taxa de poupança, com base nas receitas e despesas deste mês.',
    'The 5 largest single expenses this month, with category and date.':
      'As 5 maiores despesas individuais deste mês, com categoria e data.',
    'Where the money went: the 5 places you spent the most over the last 3 months, grouped by description.':
      'Para onde foi o dinheiro: os 5 sítios onde mais gastou nos últimos 3 meses, agrupados por descrição.',
    'Recurring charges detected automatically: same description and amount (±5%) in at least 3 of the last 4 months.':
      'Cobranças recorrentes detetadas automaticamente: mesma descrição e montante (±5%) em pelo menos 3 dos últimos 4 meses.',
    'Your holdings ranked by percentage gain since purchase — best performers on top.':
      'As suas posições ordenadas pelo ganho percentual desde a compra — as melhores no topo.',
    "This month's expenses per profile, as bars in each person's colour.":
      'As despesas deste mês por perfil, em barras na cor de cada pessoa.',
    "Each profile's net result this month (their income minus their expenses).":
      'O resultado líquido de cada perfil este mês (as suas receitas menos as suas despesas).',
    "This month's income per profile, as bars in each person's colour.":
      'As receitas deste mês por perfil, em barras na cor de cada pessoa.',
    "One line per profile with their monthly expenses over the last 6 months, in each person's colour.":
      'Uma linha por perfil com as despesas mensais dos últimos 6 meses, na cor de cada pessoa.',

    // --- widget body labels / empty states ---
    'In': 'Entradas',
    'Out': 'Saídas',
    'Net': 'Líquido',
    'Savings': 'Poupança',
    'this month': 'este mês',
    'This month': 'Este mês',
    'Last month': 'Mês passado',
    'saved this month': 'poupado este mês',
    'per day this month': 'por dia este mês',
    'target': 'objetivo',
    'Target reached — nice.': 'Objetivo alcançado — boa.',
    'Savings rate this month vs a 20% target.': 'Taxa de poupança deste mês face a um objetivo de 20%.',
    'Cash': 'Dinheiro',
    'Invested': 'Investido',
    'cash': 'dinheiro',
    'invested': 'investido',
    'Monthly total': 'Total mensal',
    'Mon': 'Seg', 'Tue': 'Ter', 'Wed': 'Qua', 'Thu': 'Qui', 'Fri': 'Sex', 'Sat': 'Sáb', 'Sun': 'Dom',
    'No spending this month.': 'Sem despesas este mês.',
    'No income this month.': 'Sem receitas este mês.',
    'No spending yet.': 'Ainda sem despesas.',
    'No accounts.': 'Sem contas.',
    'No transactions.': 'Sem transações.',
    'No holdings.': 'Sem posições.',
    'No accounts or holdings yet.': 'Ainda não há contas nem posições.',
    'No expenses in the last 3 months.': 'Sem despesas nos últimos 3 meses.',
    'No recurring charges detected yet.': 'Ainda não foram detetadas cobranças recorrentes.',

    // --- themes / personalize ---
    'Personalize': 'Personalizar',
    'Page style': 'Estilo da página',
    'Theme': 'Tema',
    'Accent': 'Cor de destaque',
    'Custom color': 'Cor personalizada',
    'Font': 'Tipo de letra',
    'Background': 'Fundo',
    'None': 'Nenhum',
    'Tint': 'Matiz',
    'Gradient': 'Gradiente',
    'Radius': 'Raio',
    'Sharp': 'Reto',
    'Default': 'Predefinido',
    'Round': 'Arredondado',
    'Shadow': 'Sombra',
    'Soft': 'Suave',
    'Flat': 'Plano',
    'Density': 'Densidade',
    'Compact': 'Compacto',
    'Cozy': 'Confortável',
    'Roomy': 'Espaçoso',
    'Hide widget titles': 'Ocultar títulos dos widgets',
    'Behavior': 'Comportamento',
    'Widgets move aside while dragging': 'Os widgets afastam-se ao arrastar',
    // theme preset names
    'Indigo': 'Índigo', 'Ocean': 'Oceano', 'Amber': 'Âmbar', 'Rose': 'Rosa', 'Serif': 'Serifa',
    'Violet': 'Violeta', 'Teal': 'Verde-azulado', 'Sky': 'Céu', 'Forest': 'Floresta',
    'Sunset': 'Pôr do sol', 'Crimson': 'Carmesim', 'Berry': 'Baga', 'Gold': 'Dourado',
    'Slate': 'Ardósia', 'Mono': 'Mono',
    // font names
    'System': 'Sistema', 'Rounded': 'Arredondado',

    // --- prebuilt template names ---
    'Overview': 'Visão geral',
    'Spending focus': 'Foco nas despesas',
    'Wealth': 'Riqueza',
    'Household': 'Agregado familiar',
    'Stocks': 'Ações',
    'Subscriptions & habits': 'Subscrições e hábitos',
    'Year in review': 'Retrospetiva do ano',

    // --- transactions ---
    'Transactions': 'Transações',
    '1 transaction': '1 transação',
    '{n} transactions': '{n} transações',
    '+ Add': '+ Adicionar',
    'All months': 'Todos os meses',
    'All types': 'Todos os tipos',
    'All categories': 'Todas as categorias',
    'All accounts': 'Todas as contas',
    'Income': 'Receita',
    'Expense': 'Despesa',
    'Expenses': 'Despesas',
    'income': 'receita',
    'expense': 'despesa',
    'New Transaction': 'Nova Transação',
    'Edit Transaction': 'Editar Transação',
    'Type': 'Tipo',
    'Amount': 'Montante',
    '0.00': '0,00',
    'Category': 'Categoria',
    'Account': 'Conta',
    'Profile': 'Perfil',
    'Shared / none': 'Partilhado / nenhum',
    'Date': 'Data',
    'Description': 'Descrição',
    'Optional note': 'Nota opcional',
    'Save': 'Guardar',
    'Cancel': 'Cancelar',
    'Create': 'Criar',
    'Delete': 'Eliminar',
    'Transaction added': 'Transação adicionada',
    'Transaction updated': 'Transação atualizada',
    'Transaction deleted': 'Transação eliminada',
    'Delete this transaction?': 'Eliminar esta transação?',
    'No transactions found.': 'Nenhuma transação encontrada.',
    'Prev': 'Anterior',
    'Next': 'Seguinte',
    'Page {p} / {n}': 'Página {p} / {n}',
    'Error: {msg}': 'Erro: {msg}',
    'Cannot delete: {msg}': 'Não é possível eliminar: {msg}',

    // --- stocks ---
    'Portfolio Value': 'Valor do Portefólio',
    'Total Gain/Loss': 'Ganho/Perda Total',
    'Refresh': 'Atualizar',
    '+ Add Holding': '+ Adicionar Posição',
    'No stock holdings yet.': 'Ainda não há posições em ações.',
    '{n} shares': '{n} ações',
    'stale': 'desatualizado',
    'No price data': 'Sem dados de preço',
    'Avg': 'Méd.',
    'New Holding': 'Nova Posição',
    'Edit Holding': 'Editar Posição',
    'Ticker': 'Ticker',
    'e.g. AAPL, VWCE.DE': 'ex.: AAPL, VWCE.DE',
    'e.g. Apple Inc.': 'ex.: Apple Inc.',
    'Shares': 'Ações',
    'Avg. Purchase Price': 'Preço Médio de Compra',
    'Purchase Date': 'Data de Compra',
    'Currency': 'Moeda',
    'Holding added': 'Posição adicionada',
    'Holding updated': 'Posição atualizada',
    'Holding deleted': 'Posição eliminada',
    'Delete this holding?': 'Eliminar esta posição?',
    'No stocks to refresh': 'Sem ações para atualizar',
    'Fetching prices...': 'A obter preços...',
    'Updated {u}/{n} prices': 'Atualizados {u}/{n} preços',

    // --- accounts ---
    'No accounts yet. Add your first account.': 'Ainda não há contas. Adicione a sua primeira conta.',
    '+ Add Account': '+ Adicionar Conta',
    'New Account': 'Nova Conta',
    'Edit Account': 'Editar Conta',
    'Name': 'Nome',
    'e.g. Main Bank': 'ex.: Banco Principal',
    'Checking': 'À ordem',
    'Investment': 'Investimento',
    'Initial Balance': 'Saldo Inicial',
    'Account created': 'Conta criada',
    'Account updated': 'Conta atualizada',
    'Account deleted': 'Conta eliminada',
    'Delete this account? All its transactions will also be deleted.':
      'Eliminar esta conta? Todas as suas transações também serão eliminadas.',

    // --- categories ---
    'Custom': 'Personalizadas',
    'No categories yet.': 'Ainda não há categorias.',
    'New Category': 'Nova Categoria',
    'Edit Category': 'Editar Categoria',
    'Colour': 'Cor',
    'Category created': 'Categoria criada',
    'Category updated': 'Categoria atualizada',
    'Category deleted': 'Categoria eliminada',
    'Delete this category? Transactions using it will need reassignment.':
      'Eliminar esta categoria? As transações que a usam terão de ser reatribuídas.',
    'Manage categories': 'Gerir categorias',

    // --- settings ---
    'Profiles': 'Perfis',
    'share this account': 'partilham esta conta',
    'No profiles yet. Add one per person (e.g. for a couple) to track who spent what — everything stays in this one account.':
      'Ainda não há perfis. Adicione um por pessoa (ex.: para um casal) para saber quem gastou o quê — tudo fica nesta única conta.',
    '+ Add Profile': '+ Adicionar Perfil',
    'New Profile': 'Novo Perfil',
    'Edit Profile': 'Editar Perfil',
    'e.g. Alex': 'ex.: Alex',
    'Profile created': 'Perfil criado',
    'Profile updated': 'Perfil atualizado',
    'Profile deleted': 'Perfil eliminado',
    'Delete this profile? Its transactions stay, but become unassigned (shared).':
      'Eliminar este perfil? As suas transações mantêm-se, mas ficam por atribuir (partilhadas).',
    'Export Transactions (CSV)': 'Exportar Transações (CSV)',
    'No transactions to export': 'Sem transações para exportar',
    'CSV exported': 'CSV exportado',
    'Export failed: {msg}': 'Falha na exportação: {msg}',
    'Language': 'Idioma',
    'Help': 'Ajuda',
    'Session': 'Sessão',
    'Developer': 'Programador',
    'Fills your account with <strong>[TEST]</strong>-tagged dummy data (3 accounts, 24 months, sample stocks). Wipe removes only tagged data — real records are never touched.':
      'Preenche a sua conta com dados fictícios marcados com <strong>[TEST]</strong> (3 contas, 24 meses, ações de exemplo). A limpeza remove apenas os dados marcados — os registos reais nunca são tocados.',
    'Generate test data': 'Gerar dados de teste',
    'Wipe test data': 'Limpar dados de teste',
    'Generate 24 months of [TEST] dummy data (accounts, transactions, stocks)?':
      'Gerar 24 meses de dados fictícios [TEST] (contas, transações, ações)?',
    'Generating…': 'A gerar…',
    'Added {t} transactions, {a} accounts, {s} stocks': 'Adicionadas {t} transações, {a} contas, {s} ações',
    'Generate failed: {msg}': 'Falha ao gerar: {msg}',
    'Delete ALL [TEST] dummy data? Real records are not affected.':
      'Eliminar TODOS os dados fictícios [TEST]? Os registos reais não são afetados.',
    'Wiped {a} test accounts + {s} stocks': 'Limpas {a} contas de teste + {s} ações',
    'Wipe failed: {msg}': 'Falha na limpeza: {msg}',

    // --- help / FAQ ---
    'Getting started': 'Primeiros passos',
    '<strong>MyFinance</strong> tracks your money in one place — what comes in, what goes out, your accounts, and your investments — and shows it back to you as simple dashboards.':
      'O <strong>MyFinance</strong> acompanha o seu dinheiro num só lugar — o que entra, o que sai, as suas contas e os seus investimentos — e mostra-lho em dashboards simples.',
    'Your data is private to your account and stored securely.':
      'Os seus dados são privados da sua conta e armazenados em segurança.',
    'How do I…': 'Como…',
    'Add income or an expense?': 'Adicionar uma receita ou despesa?',
    'Open <strong>Transactions</strong> → <strong>+ Add</strong>. Pick a type, amount, category, account and date. It appears instantly in your lists and dashboard.':
      'Abra <strong>Transações</strong> → <strong>+ Adicionar</strong>. Escolha o tipo, montante, categoria, conta e data. Aparece de imediato nas suas listas e no dashboard.',
    'Create an account?': 'Criar uma conta?',
    'Open <strong>Data → Accounts → + Add Account</strong> (e.g. a checking account, savings, or cash). Every transaction belongs to one account.':
      'Abra <strong>Dados → Contas → + Adicionar Conta</strong> (ex.: conta à ordem, poupança ou dinheiro). Cada transação pertence a uma conta.',
    'Change my categories?': 'Alterar as minhas categorias?',
    'Go to <strong>Settings → Categories</strong>. You can add your own, pick an <strong>icon and colour</strong>, and delete custom ones. The colour is used across your charts.':
      'Vá a <strong>Definições → Categorias</strong>. Pode adicionar as suas, escolher um <strong>ícone e cor</strong> e eliminar as personalizadas. A cor é usada em todos os seus gráficos.',
    'Track a stock?': 'Acompanhar uma ação?',
    'Open <strong>Stocks → + Add Holding</strong>. Enter the ticker (e.g. AAPL), how many shares, and your average buy price. Tap <strong>Refresh</strong> to update prices.':
      'Abra <strong>Ações → + Adicionar Posição</strong>. Introduza o ticker (ex.: AAPL), o número de ações e o seu preço médio de compra. Toque em <strong>Atualizar</strong> para atualizar os preços.',
    'Fill the app with test data?': 'Encher a aplicação com dados de teste?',
    'Settings → <strong>Developer → Generate test data</strong> creates realistic sample data tagged <em>[TEST]</em>. <strong>Wipe test data</strong> removes only that — your real records are never touched.':
      'Definições → <strong>Programador → Gerar dados de teste</strong> cria dados de exemplo realistas marcados com <em>[TEST]</em>. <strong>Limpar dados de teste</strong> remove apenas isso — os seus registos reais nunca são tocados.',
    'Good to know': 'Convém saber',
    'Live stock prices': 'Preços de ações em tempo real',
    'Prices come from a market data service. Without a key configured, holdings still show but current prices may be blank.':
      'Os preços vêm de um serviço de dados de mercado. Sem uma chave configurada, as posições continuam a aparecer, mas os preços atuais podem ficar em branco.',
    'Everything fits one screen': 'Tudo cabe num ecrã',
    'Pages are designed not to scroll — long lists page through with the <strong>◂ Prev / Next ▸</strong> buttons instead.':
      'As páginas foram desenhadas para não ter scroll — as listas longas navegam-se com os botões <strong>◂ Anterior / Seguinte ▸</strong>.',
    'Is my data safe?': 'Os meus dados estão seguros?',
    'Each account only ever sees its own data. Nothing is shared with other users.':
      'Cada conta só vê os seus próprios dados. Nada é partilhado com outros utilizadores.',
    'More features (shared profiles for couples, customizable dashboards) are on the way.':
      'Mais funcionalidades (perfis partilhados para casais, dashboards personalizáveis) estão a caminho.',
  },
};

export const LANGS = { en: 'English', pt: 'Português (Portugal)' };

let lang = localStorage.getItem('mf.lang') || 'en';
if (!LANGS[lang]) lang = 'en';
document.documentElement.lang = locale();

export function getLang() { return lang; }
export function setLang(l) {
  lang = LANGS[l] ? l : 'en';
  localStorage.setItem('mf.lang', lang);
  document.documentElement.lang = locale();
}

// BCP-47 locale for Intl (number/date formatting follows the display language).
export function locale() { return lang === 'pt' ? 'pt-PT' : 'en'; }

// t('Delete this page?') · t('Added {n} rows', { n: 3 })
export function t(s, params) {
  let out = (lang !== 'en' && DICT[lang]?.[s]) || s;
  if (params) for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, v);
  return out;
}
