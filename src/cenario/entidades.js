// Pessoas e empresas INVENTADAS. Qualquer coincidência com empresa ou pessoa real é acidental.
export const AVISO_FICTICIO = 'DOCUMENTO FICTÍCIO · Laboratório de Fechamento · Theasier';

export const FORNECEDORES = [
  { nome: 'Moinho Sol Nascente Ltda', categoria: 'farinha', faixa: [80000, 450000], itens: ['Farinha de trigo tipo 1 (saco 50 kg)', 'Farinha integral (saco 25 kg)', 'Fermento biológico (caixa)'] },
  { nome: 'Laticínios Vale Verde Ltda', categoria: 'laticínios', faixa: [60000, 300000], itens: ['Leite integral (caixa com 12)', 'Manteiga sem sal (bloco 5 kg)', 'Queijo muçarela (peça)'] },
  { nome: 'Embalagens Brisa Ltda', categoria: 'embalagens', faixa: [30000, 180000], itens: ['Sacos de papel kraft (milheiro)', 'Caixas para bolo (pacote)', 'Etiquetas adesivas (rolo)'] },
  { nome: 'Gás Cabo Azul Distribuidora Ltda', categoria: 'gás', faixa: [35000, 70000], itens: ['Botijão de gás 45 kg'] },
  { nome: 'Potiguar Energia Fictícia S.A.', categoria: 'energia', faixa: [90000, 180000], itens: ['Fornecimento de energia elétrica (mês)'] },
  { nome: 'Doces e Açúcar Estrela Ltda', categoria: 'açúcar', faixa: [50000, 250000], itens: ['Açúcar refinado (fardo)', 'Chocolate em barra (caixa)', 'Essência de baunilha (frasco)'] },
  { nome: 'Ovos Campo Alegre Ltda', categoria: 'ovos', faixa: [30000, 120000], itens: ['Ovos brancos (caixa com 30 dúzias)'] },
  { nome: 'Forno Certo Manutenção Ltda', categoria: 'manutenção', faixa: [25000, 90000], itens: ['Manutenção preventiva de forno', 'Troca de resistência'] },
  { nome: 'Papelaria Ponto Final Ltda', categoria: 'papelaria', faixa: [5000, 25000], itens: ['Bobina de papel térmico (caixa)', 'Material de escritório'] },
  { nome: 'Rota Leve Transportes Ltda', categoria: 'frete', faixa: [15000, 60000], itens: ['Frete de mercadorias'] },
  { nome: 'Fibra Boa Internet Ltda', categoria: 'internet', faixa: [12000, 25000], itens: ['Serviço de internet banda larga (mês)'] },
  { nome: 'Brilho Total Limpeza Ltda', categoria: 'limpeza', faixa: [8000, 40000], itens: ['Produtos de limpeza (kit)', 'Detergente industrial (galão)'] },
  { nome: 'Frutas do Sítio Ltda', categoria: 'frutas', faixa: [20000, 90000], itens: ['Frutas variadas (caixa)', 'Polpa de fruta (pacote)'] },
  { nome: 'Abrigo Seguradora Fictícia Ltda', categoria: 'seguro', faixa: [30000, 60000], itens: ['Prêmio de seguro empresarial (parcela)'] },
];

export const DESPESAS_SEM_NOTA = [
  { descricao: 'PIX ENVIADO MARIA ENTREGADORA', beneficiario: 'Maria Entregadora', valor: 18000, motivo: 'entregas do fim de semana' },
  { descricao: 'PIX ENVIADO JOSE PEDREIRO', beneficiario: 'José Pedreiro', valor: 45000, motivo: 'reparo da bancada' },
  { descricao: 'PAG FEIRA DO PRODUTOR', beneficiario: 'Feira do Produtor', valor: 32000, motivo: 'compra de frutas e verduras' },
  { descricao: 'PIX ENVIADO CARLOS ELETRICISTA', beneficiario: 'Carlos Eletricista', valor: 28000, motivo: 'troca de tomadas' },
  { descricao: 'PIX ENVIADO ANA COSTUREIRA', beneficiario: 'Ana Costureira', valor: 60000, motivo: 'uniformes da equipe' },
  { descricao: 'PIX ENVIADO LUIS CHAVEIRO', beneficiario: 'Luís Chaveiro', valor: 9000, motivo: 'cópia de chaves' },
  { descricao: 'DEB AUTOM TAXA LIXO MUNICIPAL', beneficiario: 'Prefeitura (taxa)', valor: 15000, motivo: 'taxa de lixo' },
  { descricao: 'PIX ENVIADO PEDRO ENTREGAS', beneficiario: 'Pedro Entregas', valor: 12000, motivo: 'entregas' },
  { descricao: 'PAG BOLETO ASSOCIACAO COMERCIAL', beneficiario: 'Associação Comercial', valor: 22000, motivo: 'mensalidade da associação' },
  { descricao: 'PIX ENVIADO RAIMUNDO MECANICO', beneficiario: 'Raimundo Mecânico', valor: 38000, motivo: 'conserto da van' },
];

export const TARIFAS = [
  { descricao: 'TARIFA PACOTE SERVICOS', valor: 4500 }, { descricao: 'TARIFA TED', valor: 1260 }, { descricao: 'IOF OPERACAO', valor: 780 },
  { descricao: 'TARIFA MANUTENCAO CONTA', valor: 2990 }, { descricao: 'TARIFA PIX EXCEDENTE', valor: 650 }, { descricao: 'TARIFA EMISSAO BOLETO', valor: 1190 },
];

export const CLIENTE = { nome: 'Padaria Aurora Ltda (FICTÍCIA)', fantasia: 'Padaria Aurora', responsavel: 'Aurora' };
export const ESCRITORIO = { nome: 'Escritório Exemplo Contabilidade (FICTÍCIO)' };
export const BANCO = { nome: 'Banco Exemplo S.A. (FICTÍCIO)', agencia: '0001', conta: '12345-6' };
