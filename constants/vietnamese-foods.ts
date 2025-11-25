export interface FoodCategory {
  name: string;
  keywords: string[];
  searchTerms: string[];
  category: 'main' | 'snack' | 'drink' | 'dessert' | 'street-food';
}

export const VIETNAMESE_FOODS: FoodCategory[] = [
  {
    name: 'Phở',
    keywords: ['phở', 'pho', 'phở bò', 'phở gà', 'phở tái', 'phở chín'],
    searchTerms: ['phở', 'pho'],
    category: 'main',
  },
  {
    name: 'Bún',
    keywords: ['bún', 'bun', 'bún bò', 'bún chả', 'bún riêu', 'bún đậu', 'bún mắm', 'bún thịt nướng'],
    searchTerms: ['bún', 'bun'],
    category: 'main',
  },
  {
    name: 'Cơm',
    keywords: ['cơm', 'com', 'cơm tấm', 'cơm sườn', 'cơm gà', 'cơm chiên', 'cơm văn phòng'],
    searchTerms: ['cơm', 'com tam', 'cơm tấm'],
    category: 'main',
  },
  {
    name: 'Bánh mì',
    keywords: ['bánh mì', 'banh mi', 'bánh mỳ', 'banh my'],
    searchTerms: ['bánh mì', 'banh mi'],
    category: 'street-food',
  },
  {
    name: 'Hủ tiếu',
    keywords: ['hủ tiếu', 'hu tieu', 'hủ tíu'],
    searchTerms: ['hủ tiếu', 'hu tieu'],
    category: 'main',
  },
  {
    name: 'Mì',
    keywords: ['mì', 'mi', 'mỳ', 'my', 'mì xào', 'mì quảng', 'mì cay'],
    searchTerms: ['mì', 'mi quang'],
    category: 'main',
  },
  {
    name: 'Bánh xèo',
    keywords: ['bánh xèo', 'banh xeo'],
    searchTerms: ['bánh xèo'],
    category: 'main',
  },
  {
    name: 'Gỏi cuốn',
    keywords: ['gỏi cuốn', 'goi cuon', 'nem cuốn'],
    searchTerms: ['gỏi cuốn'],
    category: 'snack',
  },
  {
    name: 'Chả giò',
    keywords: ['chả giò', 'cha gio', 'nem rán', 'ram'],
    searchTerms: ['chả giò', 'nem'],
    category: 'snack',
  },
  {
    name: 'Lẩu',
    keywords: ['lẩu', 'lau', 'lẩu thái', 'lẩu cá', 'lẩu bò', 'lẩu nấm'],
    searchTerms: ['lẩu', 'lau'],
    category: 'main',
  },
  {
    name: 'Bánh cuốn',
    keywords: ['bánh cuốn', 'banh cuon'],
    searchTerms: ['bánh cuốn'],
    category: 'main',
  },
  {
    name: 'Cao lầu',
    keywords: ['cao lầu', 'cao lau'],
    searchTerms: ['cao lầu'],
    category: 'main',
  },
  {
    name: 'Bánh canh',
    keywords: ['bánh canh', 'banh canh'],
    searchTerms: ['bánh canh'],
    category: 'main',
  },
  {
    name: 'Xôi',
    keywords: ['xôi', 'xoi', 'xôi xéo', 'xôi gà', 'xôi thịt'],
    searchTerms: ['xôi'],
    category: 'main',
  },
  {
    name: 'Bánh bao',
    keywords: ['bánh bao', 'banh bao'],
    searchTerms: ['bánh bao'],
    category: 'snack',
  },
  {
    name: 'Chè',
    keywords: ['chè', 'che'],
    searchTerms: ['chè'],
    category: 'dessert',
  },
  {
    name: 'Bánh flan',
    keywords: ['bánh flan', 'banh flan', 'flan', 'caramen'],
    searchTerms: ['bánh flan'],
    category: 'dessert',
  },
  {
    name: 'Bánh bèo',
    keywords: ['bánh bèo', 'banh beo'],
    searchTerms: ['bánh bèo'],
    category: 'snack',
  },
  {
    name: 'Nem nướng',
    keywords: ['nem nướng', 'nem nuong'],
    searchTerms: ['nem nướng'],
    category: 'main',
  },
  {
    name: 'Bò bía',
    keywords: ['bò bía', 'bo bia'],
    searchTerms: ['bò bía'],
    category: 'snack',
  },
  {
    name: 'Cháo',
    keywords: ['cháo', 'chao', 'cháo lòng', 'cháo gà'],
    searchTerms: ['cháo'],
    category: 'main',
  },
  {
    name: 'Bò kho',
    keywords: ['bò kho', 'bo kho'],
    searchTerms: ['bò kho'],
    category: 'main',
  },
  {
    name: 'Bún bò Huế',
    keywords: ['bún bò huế', 'bun bo hue'],
    searchTerms: ['bún bò huế'],
    category: 'main',
  },
  {
    name: 'Bún chả',
    keywords: ['bún chả', 'bun cha'],
    searchTerms: ['bún chả'],
    category: 'main',
  },
  {
    name: 'Bún riêu',
    keywords: ['bún riêu', 'bun rieu'],
    searchTerms: ['bún riêu'],
    category: 'main',
  },
  {
    name: 'Bún đậu mắm tôm',
    keywords: ['bún đậu', 'bun dau', 'bún đậu mắm tôm'],
    searchTerms: ['bún đậu'],
    category: 'main',
  },
  {
    name: 'Bánh tráng trộn',
    keywords: ['bánh tráng trộn', 'banh trang tron', 'bánh tráng'],
    searchTerms: ['bánh tráng'],
    category: 'snack',
  },
  {
    name: 'Cơm tấm',
    keywords: ['cơm tấm', 'com tam', 'cơm sườn'],
    searchTerms: ['cơm tấm'],
    category: 'main',
  },
  {
    name: 'Bánh khọt',
    keywords: ['bánh khọt', 'banh khot'],
    searchTerms: ['bánh khọt'],
    category: 'snack',
  },
  {
    name: 'Cà phê',
    keywords: ['cà phê', 'ca phe', 'cafe', 'coffee', 'cà phê sữa', 'cà phê đen'],
    searchTerms: ['cafe', 'coffee', 'cà phê'],
    category: 'drink',
  },
  {
    name: 'Trà sữa',
    keywords: ['trà sữa', 'tra sua', 'milk tea', 'trà', 'tra'],
    searchTerms: ['trà sữa', 'tra sua'],
    category: 'drink',
  },
  {
    name: 'Nước ép',
    keywords: ['nước ép', 'nuoc ep', 'sinh tố', 'smoothie'],
    searchTerms: ['nước ép', 'sinh tố'],
    category: 'drink',
  },
  {
    name: 'Ốc',
    keywords: ['ốc', 'oc'],
    searchTerms: ['ốc'],
    category: 'street-food',
  },
  {
    name: 'Hải sản',
    keywords: ['hải sản', 'hai san', 'seafood'],
    searchTerms: ['hải sản', 'seafood'],
    category: 'main',
  },
  {
    name: 'Nướng',
    keywords: ['nướng', 'nuong', 'bbq', 'quán nướng', 'thịt nướng'],
    searchTerms: ['nướng', 'bbq'],
    category: 'main',
  },
  {
    name: 'Nhậu',
    keywords: ['nhậu', 'nhau', 'bia', 'quán nhậu'],
    searchTerms: ['nhậu', 'bia'],
    category: 'main',
  },
  {
    name: 'Dimsum',
    keywords: ['dimsum', 'dim sum', 'há cảo', 'xíu mại'],
    searchTerms: ['dimsum'],
    category: 'main',
  },
  {
    name: 'Miến',
    keywords: ['miến', 'mien', 'miến gà', 'miến lươn'],
    searchTerms: ['miến'],
    category: 'main',
  },
  {
    name: 'Canh',
    keywords: ['canh', 'soup'],
    searchTerms: ['canh'],
    category: 'main',
  },
  {
    name: 'Cá',
    keywords: ['cá', 'ca', 'fish', 'cá kho', 'cá chiên'],
    searchTerms: ['cá'],
    category: 'main',
  },
  {
    name: 'Gà',
    keywords: ['gà', 'ga', 'chicken', 'gà rán', 'gà nướng'],
    searchTerms: ['gà', 'chicken'],
    category: 'main',
  },
  {
    name: 'Sườn',
    keywords: ['sườn', 'suon', 'ribs', 'sườn nướng'],
    searchTerms: ['sườn'],
    category: 'main',
  },
  {
    name: 'Bò',
    keywords: ['bò', 'bo', 'beef', 'bít tết'],
    searchTerms: ['bò', 'beef'],
    category: 'main',
  },
  {
    name: 'Tôm',
    keywords: ['tôm', 'tom', 'shrimp', 'tôm hấp'],
    searchTerms: ['tôm'],
    category: 'main',
  },
];

export function findFoodByKeyword(keyword: string): FoodCategory | undefined {
  const normalized = keyword.toLowerCase().trim();
  return VIETNAMESE_FOODS.find(food => 
    food.keywords.some(k => k.toLowerCase().includes(normalized) || normalized.includes(k.toLowerCase()))
  );
}

export function getFoodSearchTerms(keyword: string): string[] {
  const food = findFoodByKeyword(keyword);
  return food ? food.searchTerms : [keyword];
}

export function getAllFoodsByCategory(category: FoodCategory['category']): FoodCategory[] {
  return VIETNAMESE_FOODS.filter(food => food.category === category);
}
