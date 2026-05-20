import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Utensils, ArrowLeft, Leaf, Flame } from 'lucide-react';

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
  const [menuData, setMenuData] = useState<MenuData>({ items: [], theme: 'classic' });

  useEffect(() => {
    const savedMenu = localStorage.getItem(`menu_${companyName}`);
    if (savedMenu) {
      // Handle legacy save format vs new format
      const parsed = JSON.parse(savedMenu);
      if (Array.isArray(parsed)) {
        setMenuData({ items: parsed, theme: 'classic' });
      } else {
        setMenuData(parsed);
      }
    }
  }, [companyName]);

  const { items, theme } = menuData;

  const groupedItems = items.reduce((acc, item) => {
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
      icon: <Utensils className="w-64 h-64 absolute -top-10 -right-10 transform rotate-12 opacity-10" />
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
      icon: <Flame className="w-64 h-64 absolute -top-10 -right-10 transform rotate-12 opacity-5 text-yellow-500" />
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
      icon: <Leaf className="w-64 h-64 absolute -top-10 -right-10 transform rotate-12 opacity-10" />
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
          <Link to="/" className={`inline-flex items-center gap-2 mb-6 transition opacity-80 hover:opacity-100`}>
            <ArrowLeft size={20} /> Voltar
          </Link>
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
