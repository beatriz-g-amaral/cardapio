import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat, Plus, Trash2, ArrowRight, LayoutTemplate, Upload, FileText, ClipboardPaste, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import LZString from 'lz-string';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
}

export default function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState('');
  const [theme, setTheme] = useState('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([
    { name: 'X-Burger', description: 'Pão, carne e queijo', price: '15.00', category: 'Lanches' }
  ]);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    const editName = searchParams.get('edit');
    let compressedData = searchParams.get('data');

    if (!compressedData) {
      const rawSearch = window.location.search || window.location.hash.split('?')[1] || '';
      const dataMatch = rawSearch.match(/data=([^&]+)/);
      if (dataMatch) {
        compressedData = dataMatch[1];
      }
    }

    if (editName && compressedData) {
      setCompanyName(editName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      try {
        const fixedData = compressedData.replace(/ /g, '+');
        const decompressed = LZString.decompressFromEncodedURIComponent(fixedData);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          if (parsed.items && Array.isArray(parsed.items)) {
            setItems(parsed.items);
            if (parsed.theme) setTheme(parsed.theme);
          }
        }
      } catch (e) {
        console.error("Erro ao descomprimir dados para edição", e);
      }
    }
  }, [searchParams]);

  const handleAddItem = () => {
    setItems([...items, { name: '', description: '', price: '', category: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleChange = (index: number, field: keyof MenuItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const parseRawText = (text: string) => {
    const itemRegex = /(.*?)(?:–|-)?\s*(?:R\$|RS)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/gi;
    const importedItems: MenuItem[] = [];
    let currentCategory = 'Geral';
    let match;
    const cleanText = text.replace(/\s{2,}/g, ' ').trim();

    while ((match = itemRegex.exec(cleanText)) !== null) {
      let nameAndDesc = match[1].trim();
      let price = match[2].replace(',', '.');

      const categoryMatch = nameAndDesc.match(/^([A-ZÀ-Ú0-9\s&()!*-]+?)([A-Z][a-zÀ-ú].*)/);
      if (categoryMatch && categoryMatch[1].trim().length > 3) {
        currentCategory = categoryMatch[1].trim();
        nameAndDesc = categoryMatch[2].trim();
      } else {
        const justCapsMatch = nameAndDesc.match(/^([A-ZÀ-Ú0-9\s&()!*-]{4,})\s+(.*)/);
        if (justCapsMatch && justCapsMatch[1].trim() === justCapsMatch[1].trim().toUpperCase()) {
          currentCategory = justCapsMatch[1].trim();
          nameAndDesc = justCapsMatch[2].trim();
        }
      }

      nameAndDesc = nameAndDesc.replace(/[-–]$/, '').trim();

      if (nameAndDesc.length > 0) {
        importedItems.push({
          name: nameAndDesc,
          description: '', 
          price: price,
          category: currentCategory
        });
      }
    }

    if (importedItems.length === 0) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let tempCategory = 'Geral';
      let tempName = '';
      let tempDesc = '';
      const priceRegexSimple = /(?:R\$?\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/i;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if ((line.includes('CERVEJA') || line.includes('LANCHE') || line.includes('BEBIDA') || (line.length < 40 && line === line.toUpperCase())) && !priceRegexSimple.test(line)) {
          tempCategory = line;
          continue;
        }
        const priceMatch = line.match(priceRegexSimple);
        if (priceMatch) {
          const price = priceMatch[1].replace(',', '.');
          const textWithoutPrice = line.replace(priceMatch[0], '').trim();
          if (textWithoutPrice.length > 2) {
            importedItems.push({ name: textWithoutPrice, description: tempDesc || '', price: price, category: tempCategory });
            tempDesc = ''; tempName = '';
          } else if (tempName) {
            importedItems.push({ name: tempName, description: tempDesc || '', price: price, category: tempCategory });
            tempName = ''; tempDesc = '';
          }
        } else {
          if (!tempName || tempName.length < 3) tempName = line;
          else tempDesc += (tempDesc ? ' ' : '') + line;
        }
      }
    }

    if (importedItems.length > 0) {
      setItems(importedItems);
      setIsPasteModalOpen(false);
      setPasteText('');
      alert(`Importados ${importedItems.length} itens do texto com sucesso! Por favor, revise os dados.`);
    } else {
      alert('Não encontramos itens com preço no padrão (ex: R$ 9,50) no texto.');
    }
  };

  const parsePDF = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        cMapUrl: `https:
        cMapPacked: true,
        standardFontDataUrl: `https:
      });
      const pdf = await loadingTask.promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const itemsList = textContent.items as any[];
        const linesMap = new Map<number, string[]>();

        itemsList.forEach(item => {
          if (!item.str.trim()) return;
          const y = Math.round(item.transform[5] / 2) * 2;
          if (!linesMap.has(y)) {
            linesMap.set(y, []);
          }
          linesMap.get(y)!.push(item.str.trim());
        });

        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

        for (const y of sortedY) {
          const lineItems = linesMap.get(y)!;
          fullText += lineItems.join(' ') + '\n';
        }
      }

      parseRawText(fullText);

    } catch (error: any) {
      console.error("Erro no PDF:", error);
      alert(`Erro ao ler o PDF: ${error.message || 'Falha desconhecida'}. Tente colar o texto.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      await parsePDF(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          const importedItems: MenuItem[] = data.map(row => {
            const name = row['Nome'] || row['nome'] || row['Name'] || row['Produto'] || row['produto'] || '';
            const description = row['Descrição'] || row['descrição'] || row['Description'] || row['Detalhes'] || '';
            const priceRaw = row['Preço'] || row['preço'] || row['Price'] || row['Valor'] || row['valor'] || '0';
            const category = row['Categoria'] || row['categoria'] || row['Category'] || row['Tipo'] || 'Geral';

            const priceStr = String(priceRaw).replace(/[^0-9.,]/g, '').replace(',', '.');

            return {
              name: String(name),
              description: String(description),
              price: priceStr,
              category: String(category)
            };
          }).filter(item => item.name);

          if (importedItems.length > 0) {
            setItems(importedItems);
            alert(`Importados ${importedItems.length} itens com sucesso!`);
          } else {
            alert('Não foi possível encontrar itens. Verifique as colunas da planilha.');
          }
        } catch (error) {
          console.error(error);
          alert('Erro ao ler a planilha.');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      alert('Formato de arquivo não suportado. Use .xlsx, .csv ou .pdf.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateMenu = () => {
    if (!companyName.trim()) {
      alert('Por favor, insira o nome da empresa.');
      return;
    }

    const menuData = {
      items,
      theme
    };

    const compressedData = LZString.compressToEncodedURIComponent(JSON.stringify(menuData));

    localStorage.setItem(`menu_${companyName.toLowerCase().replace(/\s+/g, '-')}`, JSON.stringify(menuData));

    navigate(`/${companyName.toLowerCase().replace(/\s+/g, '-')}?data=${compressedData}`);
  };

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto relative">
      {/* Modal de Colar Texto */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardPaste className="text-primary" /> Colar Texto do Cardápio
              </h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <p className="text-sm text-slate-500 mb-4">
                Copie o texto de um PDF, Word ou WhatsApp e cole aqui. Nosso sistema tentará extrair nomes, descrições e preços (ex: R$ 15,00) automaticamente.
              </p>
              <textarea 
                className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="Exemplo:&#10;&#10;LANCHES&#10;X-Burger&#10;Pão, carne e queijo&#10;R$ 15,00&#10;&#10;X-Salada&#10;Pão, carne, queijo, alface e tomate&#10;R$ 18,00"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsPasteModalOpen(false)}
                className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button 
                onClick={() => parseRawText(pasteText)}
                className="px-6 py-2 bg-primary hover:bg-orange-600 text-white font-bold rounded-lg transition shadow-md"
              >
                Processar Texto
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8 text-primary">
        <ChefHat size={40} />
        <h1 className="text-4xl font-bold">Gerador de Cardápio</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Estabelecimento</label>
          <input
            type="text"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            placeholder="Ex: Lanchonete do Zé"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <LayoutTemplate size={18} /> Escolha um Modelo Visual
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setTheme('classic')}
              className={`p-4 rounded-xl border-2 text-left transition ${theme === 'classic' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <h3 className="font-bold text-orange-600 mb-1">Clássico 99</h3>
              <p className="text-xs text-slate-500">Laranja vibrante, amigável e focado em delivery.</p>
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border-2 text-left transition ${theme === 'dark' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Dark Elegante</h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>Tons escuros, ideal para hamburguerias e bares.</p>
            </button>
            <button 
              onClick={() => setTheme('minimal')}
              className={`p-4 rounded-xl border-2 text-left transition ${theme === 'minimal' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <h3 className="font-bold text-emerald-700 mb-1">Minimalista</h3>
              <p className="text-xs text-slate-500">Clean, verde suave, perfeito para comida saudável.</p>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            Itens do Cardápio {isLoading && <span className="text-sm font-normal text-blue-500 animate-pulse">(Lendo arquivo...)</span>}
          </h2>

          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv,.pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center gap-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg transition border border-purple-200"
              title="Copiar e colar texto de WhatsApp, PDF ou Word"
            >
              <ClipboardPaste size={16} /> Colar Texto
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition border border-blue-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Importar PDF ou Excel (.xlsx, .csv)"
            >
              <Upload size={16} /> Importar Arquivo
            </button>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition"
            >
              <Plus size={16} /> Adicionar Item
            </button>
          </div>
        </div>

        {items.length === 0 && (
          <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-slate-500">Nenhum item adicionado.</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Adicionar Item", "Colar Texto" ou importe um arquivo.</p>
          </div>
        )}

        {items.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group">
            <button
              onClick={() => handleRemoveItem(index)}
              className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome do Item</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                  value={item.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Ex: Lanches, Bebidas..."
                  value={item.category}
                  onChange={(e) => handleChange(index, 'category', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                  value={item.description}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Preço (R$)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                  value={item.price}
                  onChange={(e) => handleChange(index, 'price', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={generateMenu}
        className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition text-lg shadow-lg shadow-orange-200"
      >
        Gerar Cardápio <ArrowRight size={24} />
      </button>
    </div>
  );
}
