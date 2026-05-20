import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Utensils, ArrowLeft, Leaf, Flame, Share2, Check } from 'lucide-react';
import LZString from 'lz-string';

interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
}

interface MenuData {
  items: MenuItem[];
  theme: string;
}

export default function MenuPage() {
  const { companyName } = useParams();
  const [searchParams] = useSearchParams();
  const [menuData, setMenuData] = useState<MenuData>({ items: [], theme: 'classic' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Tenta carregar dados da URL primeiro (Compartilhamento)
    let compressedData = searchParams.get('data');
    
    // Fallback para ler a URL bruta caso o React Router corte o tamanho do link
    if (!compressedData) {
      const rawSearch = window.location.search || window.location.hash.split('?')[1] || '';
      const dataMatch = rawSearch.match(/data=([^&]+)/);
      if (dataMatch) {
        compressedData = dataMatch[1];
      }
    }

    if (compressedData) {
      try {
        // Quando o React Router lê a URL, ele converte os símbolos de '+' em espaços (' ').
        // O LZString precisa do '+' original para funcionar, então restauramos aqui:
        const fixedData = compressedData.replace(/ /g, '+');
        
        const decompressed = LZString.decompressFromEncodedURIComponent(fixedData);
        
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          setMenuData(parsed);
          
          // Opcional: Salva no localStorage para a pessoa não perder se tirar o parâmetro da URL
          localStorage.setItem(`menu_${companyName}`, decompressed);
          return;
        } else {
          console.error("A descompressão retornou nulo.");
        }
      } catch (e) {
        console.error("Erro ao descomprimir dados da URL", e);
      }
    }

    // 2. Se não veio pela URL, tenta pegar do localStorage
    const savedMenu = localStorage.getItem(`menu_${companyName}`);
    if (savedMenu) {
      try {
        const parsed = JSON.parse(savedMenu);
        if (Array.isArray(parsed)) {
          setMenuData({ items: parsed, theme: 'classic' });
        } else {
          setMenuData(parsed);
        }
      } catch (e) {
        console.error("Erro ao ler localStorage", e);
      }
    }
  }, [companyName, searchParams]);

  const handleShare = () => {
    // A URL atual já contém os dados comprimidos se acabou de ser gerada
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { items, theme } = menuData;

  const groupedItems = (items || []).reduce((acc, item) => {
    const cat = item.category || 'Outros';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const formatName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Theme configuration
  const themes = {
    classic: {
      bg: 'bg-slate-50',
      headerBg: 'bg-orange-500',
      headerText: 'text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-100',
      titleText: 'text-slate-800',
      descText: 'text-slate-500',
      priceText: 'text-orange-600',
      categoryBorder: 'border-orange-500/20',
      icon: <Utensils className="w-64 h-64 absolute -top-10 -right-10 transform rotate-12 opacity-10" />,
      buttonClass: 'bg-white/20 hover:bg-white/30 text-white'
    },
    dark: {
      bg: 'bg-slate-900',
      headerBg: 'bg-slate-950',
      headerText: 'text-yellow-500',
      cardBg: 'bg-slate-800',
      cardBorder: 'border-slate-700',
      titleText: 'text-slate-100',
      descText: 'text-slate-400',
      priceText: 'text-yellow-500',
      categoryBorder: 'border-yellow-500/20',
      icon: <Flame className="w-64 h-64 absolute -top-10 -right-10 transform rotate-12 opacity-5 text-yellow-500" />,
      buttonClass: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500'
    },
    minimal: {
      bg: 'bg-[#faf9f6]',
      headerBg: 'bg-emerald-800',
      headerText: 'text-[#faf9f6]',
      cardBg: 'bg-transparent',
      cardBorder: 'border-b border-emerald-900/10 rounded-none shadow-none',
      titleText: 'text-emerald-950',
      descText: 'text-emerald-800/70',
      priceText: 'text-emerald-700 font-medium',
      categoryBorder: 'border-emerald-800/20',
      icon: <Leaf className="w-64 h-64 absolute -top-10 -right-10 transform rotate-12 opacity-10" />,
      buttonClass: 'bg-white/10 hover:bg-white/20 text-[#faf9f6]'
    }
  };

  const currentTheme = themes[theme as keyof typeof themes] || themes.classic;

  return (
    <div className={`min-h-screen ${currentTheme.bg} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${currentTheme.headerBg} ${currentTheme.headerText} py-12 px-6 shadow-md relative overflow-hidden transition-colors duration-300`}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {currentTheme.icon}
        </div>
        
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex justify-between items-start mb-6">
            <Link to="/" className={`inline-flex items-center gap-2 transition opacity-80 hover:opacity-100`}>
              <ArrowLeft size={20} /> Voltar
            </Link>
            
            <button 
              onClick={handleShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all ${currentTheme.buttonClass}`}
            >
              {copied ? <Check size={18} /> : <Share2 size={18} />}
              <span className="font-medium text-sm">{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            {companyName ? formatName(companyName) : 'Cardápio'}
          </h1>
          <p className="opacity-80 text-lg">Feito com carinho para você.</p>
        </div>
      </div>

      {/* Menu Content */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        {Object.keys(groupedItems).length === 0 ? (
          <div className={`text-center py-20 ${currentTheme.descText}`}>
            <p>Nenhum item encontrado neste cardápio.</p>
            <Link to="/" className="hover:underline mt-4 inline-block font-bold">Criar um novo cardápio</Link>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <h2 className={`text-2xl font-bold ${currentTheme.titleText} mb-6 border-b-2 ${currentTheme.categoryBorder} pb-2 inline-block`}>
                  {category}
                </h2>
                <div className={`grid gap-4 ${theme === 'minimal' ? 'gap-y-8' : ''}`}>
                  {categoryItems.map((item, index) => (
                    <div key={index} className={`${currentTheme.cardBg} ${theme !== 'minimal' ? 'rounded-xl p-5 shadow-sm border' : 'pb-4 border-b'} ${currentTheme.cardBorder} flex justify-between gap-4 transition-colors duration-300`}>
                      <div className="flex-1">
                        <h3 className={`font-bold text-lg ${currentTheme.titleText}`}>{item.name}</h3>
                        <p className={`text-sm mt-1 line-clamp-2 ${currentTheme.descText}`}>{item.description}</p>
                      </div>
                      <div className={`font-bold text-lg whitespace-nowrap ${currentTheme.priceText}`}>
                        R$ {Number(item.price || 0).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
