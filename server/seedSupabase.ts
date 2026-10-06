import { createClient } from '@supabase/supabase-js';

const activeUrl =
  (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('your-project'))
    ? process.env.VITE_SUPABASE_URL
    : 'https://rvoryldhaoxwranfsxnh.supabase.co';

const activeKey =
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY.includes('your-publishable-key'))
    ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : (activeUrl.includes('dxgsuxbvhebymyuesdbm')
        ? 'sb_publishable_fLNyExGVvr2_3JZoBucq0A_2G-B9JoQ'
        : 'sb_publishable_uufSg2hSi-jkMkjBiNVAbw_HCYwXqTX');

const supabase = createClient(activeUrl, activeKey);

export async function seedSupabaseCatalog() {
  console.log('[Supabase Seeder] Verifying categories...');
  
  const defaultCategories = [
    { name: 'T-Shirts', slug: 't-shirts', description: 'Combed cotton minimalist crewnecks and blanks' },
    { name: 'Printed T-Shirts', slug: 'printed-t-shirts', description: 'High-density screen printed and graphic streetwear tees' },
    { name: 'Hoodies', slug: 'hoodies', description: 'Heavyweight brushed fleece drop-shoulder winter hoodies' },
    { name: 'Custom T-Shirts', slug: 'custom-t-shirts', description: 'Personalized custom printed bulk and team apparel' },
    { name: 'Wholesale', slug: 'wholesale', description: 'B2B factory rate matrix orders for clothing brands' },
    { name: 'Jacket', slug: 'jacket', description: 'Puffers, utility outerwear and windbreakers' },
  ];

  for (const cat of defaultCategories) {
    await supabase.from('product_categories').upsert(cat, { onConflict: 'slug' });
  }

  const { data: cats } = await supabase.from('product_categories').select('*');
  const catMap = new Map<string, string>();
  (cats || []).forEach((c) => catMap.set(c.name.toLowerCase(), c.id));

  const catalog = [
    {
      name: 'Signature Drop Shoulder Heavyweight Tee',
      slug: 'signature-drop-shoulder-heavyweight-tee',
      category: 'T-Shirts',
      product_type: 'normal',
      product_types: ['normal'],
      regular_price: 790,
      sale_price: 650,
      wholesale_price: 390,
      min_wholesale_qty: 25,
      sku: 'SHK-TEE-001',
      description: 'Premium 240 GSM combed compact cotton with relaxed drop-shoulder cut, reinforced ribbed collar, and anti-shrink enzyme wash finish.',
      short_description: '240 GSM Combed Cotton • Relaxed Drop Shoulder',
      brand: 'Shokh Outfits',
      tags: ['drop-shoulder', 'heavyweight', 'cotton', 'plain', 'basics'],
      badge: 'Bestseller',
      fabric: '100% Combed Compact Cotton',
      gsm: '240 GSM',
      fit: 'Relaxed Drop Shoulder',
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
      ],
      colors: [
        { name: 'Charcoal Gray', hex: '#374151' },
        { name: 'Sage Green', hex: '#a7f3d0' },
        { name: 'Pure White', hex: '#ffffff' },
        { name: 'Jet Black', hex: '#111827' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      name: 'Cyber-Samurai Printed Streetwear Graphic Tee',
      slug: 'cyber-samurai-printed-streetwear-tee',
      category: 'Printed T-Shirts',
      product_type: 'printed',
      product_types: ['printed'],
      regular_price: 890,
      sale_price: 750,
      wholesale_price: 490,
      min_wholesale_qty: 20,
      sku: 'SHK-PRT-002',
      description: 'Ultra-high density DTF graphic back print with front minimal chest logo. Crafted from 220 GSM super-soft combed cotton with crack-resistant plastisol finish.',
      short_description: 'High-Density Graphic Print • 220 GSM Cotton',
      brand: 'Shokh Outfits',
      tags: ['printed', 'graphic', 'streetwear', 'cyberpunk', 'anime'],
      badge: 'Popular',
      fabric: '100% Combed Cotton',
      gsm: '220 GSM',
      fit: 'Oversized Streetwear',
      images: [
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80',
      ],
      colors: [
        { name: 'Vintage Washed Black', hex: '#1f2421' },
        { name: 'Off-White Ivory', hex: '#f4f1ea' },
        { name: 'Midnight Navy', hex: '#1e293b' },
      ],
      sizes: ['M', 'L', 'XL', 'XXL'],
    },
    {
      name: 'Tokyo Underground Kanji Printed Heavyweight Tee',
      slug: 'tokyo-underground-kanji-printed-tee',
      category: 'Printed T-Shirts',
      product_type: 'printed',
      product_types: ['printed'],
      regular_price: 850,
      sale_price: 690,
      wholesale_price: 450,
      min_wholesale_qty: 25,
      sku: 'SHK-PRT-003',
      description: 'Futuristic Japanese Kanji and brutalist typography screen print. Breathable inks with soft hand-feel that never fades through washing.',
      short_description: 'Brutalist Kanji Graphic • Screen Printed',
      brand: 'Shokh Outfits',
      tags: ['printed', 'typography', 'japanese', 'kanji', 'streetwear'],
      badge: 'Trending',
      fabric: '100% Organic Combed Cotton',
      gsm: '230 GSM',
      fit: 'Boxy Drop Shoulder',
      images: [
        'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      ],
      colors: [
        { name: 'Jet Black', hex: '#111827' },
        { name: 'Chalk White', hex: '#ffffff' },
      ],
      sizes: ['S', 'M', 'L', 'XL'],
    },
    {
      name: 'Heavyweight Fleece Drop-Shoulder Hoodie',
      slug: 'heavyweight-fleece-drop-shoulder-hoodie',
      category: 'Hoodies',
      product_type: 'normal',
      product_types: ['normal'],
      regular_price: 1850,
      sale_price: 1450,
      wholesale_price: 990,
      min_wholesale_qty: 15,
      sku: 'SHK-HUD-004',
      description: '380 GSM ultra-heavyweight brushed fleece hoodie. Double-lined hood, seamless kangaroo pocket, pre-shrunk anti-pilling organic fabric.',
      short_description: '380 GSM Brushed Fleece • Double-Lined Hood',
      brand: 'Shokh Outfits',
      tags: ['hoodie', 'winter', 'fleece', 'heavyweight', 'drop-shoulder'],
      badge: 'Winter Special',
      fabric: '80% Cotton / 20% Polyester Heavy Fleece',
      gsm: '380 GSM',
      fit: 'Oversized Boxy',
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80',
      ],
      colors: [
        { name: 'Charcoal Heather', hex: '#374151' },
        { name: 'Forest Green', hex: '#0d2822' },
        { name: 'Bone White', hex: '#f5f5f4' },
      ],
      sizes: ['M', 'L', 'XL', 'XXL'],
    },
    {
      name: 'Urban Puffer Jacket With Utility Pocket Detail',
      slug: 'urban-puffer-jacket-utility-pocket',
      category: 'Jacket',
      product_type: 'normal',
      product_types: ['normal'],
      regular_price: 2450,
      sale_price: 1950,
      wholesale_price: 1350,
      min_wholesale_qty: 10,
      sku: 'SHK-JKT-005',
      description: 'Windproof, water-resistant insulated puffer jacket featuring tactical chest pocket, double-slider YKK zipper, and adjustable elastic hem.',
      short_description: 'Water-Resistant • Thermal Insulation',
      brand: 'Shokh Outfits',
      tags: ['puffer', 'jacket', 'outerwear', 'winter', 'waterproof'],
      badge: 'Bestseller',
      fabric: 'High-Density Ripstop Nylon + Microfiber Fill',
      gsm: '300 GSM Fill',
      fit: 'Relaxed Winter Fit',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80',
      ],
      colors: [
        { name: 'Matte Black', hex: '#18181b' },
        { name: 'Sage Olive', hex: '#4d5d53' },
        { name: 'Silver Ice', hex: '#e2e8f0' },
      ],
      sizes: ['M', 'L', 'XL'],
    },
    {
      name: 'B2B Wholesale Combed Cotton Blank Tees (Factory Bulk)',
      slug: 'b2b-wholesale-combed-cotton-blank-tees',
      category: 'Wholesale',
      product_type: 'wholesale',
      product_types: ['wholesale', 'normal'],
      regular_price: 650,
      sale_price: 490,
      wholesale_price: 340,
      min_wholesale_qty: 25,
      sku: 'SHK-WHL-006',
      description: 'Factory-direct rate matrix order for clothing brands, print-on-demand studios, and corporate merchandise. 210-240 GSM 100% combed cotton blanks.',
      short_description: 'Factory Bulk Pricing • Min Order 25 pcs',
      brand: 'Shokh Outfits',
      tags: ['wholesale', 'bulk', 'b2b', 'factory', 'blanks'],
      badge: 'B2B Wholesale',
      fabric: '100% Combed Compact Cotton',
      gsm: '220 GSM',
      fit: 'Regular / Drop Shoulder Mix',
      images: [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      ],
      colors: [
        { name: 'Assorted Core Colors', hex: '#374151' },
        { name: 'Jet Black Only', hex: '#111827' },
        { name: 'Pure White Only', hex: '#ffffff' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
  ];

  for (const item of catalog) {
    const catId = catMap.get(item.category.toLowerCase()) || cats?.[0]?.id;
    const { data: prod, error: pErr } = await supabase
      .from('products')
      .upsert(
        {
          name: item.name,
          slug: item.slug,
          category_id: catId,
          product_type: item.product_type,
          product_types: item.product_types,
          regular_price: item.regular_price,
          sale_price: item.sale_price,
          wholesale_price: item.wholesale_price,
          min_wholesale_qty: item.min_wholesale_qty,
          sku: item.sku,
          description: item.description,
          short_description: item.short_description,
          brand: item.brand,
          tags: item.tags,
          badge: item.badge,
          fabric: item.fabric,
          gsm: item.gsm,
          fit: item.fit,
          status: 'active',
          is_featured: true,
        },
        { onConflict: 'sku' }
      )
      .select('id')
      .single();

    if (pErr) {
      console.error('[Supabase Seeder Error]:', item.name, pErr.message);
      continue;
    }

    const prodId = prod.id;
    console.log(`[Supabase Seeder] Synced: ${item.name} (${prodId})`);

    // Sync product images
    await supabase.from('product_images').delete().eq('product_id', prodId);
    const imgRows = item.images.map((imgUrl, idx) => ({
      product_id: prodId,
      image_url: imgUrl,
      sort_order: idx,
      is_primary: idx === 0,
      alt_text: item.name,
    }));
    await supabase.from('product_images').insert(imgRows);

    // Sync product variants
    await supabase.from('product_variants').delete().eq('product_id', prodId);
    const varRows: any[] = [];
    item.colors.forEach((col) => {
      item.sizes.forEach((sz) => {
        const cleanCol = col.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
        varRows.push({
          product_id: prodId,
          sku: `${item.sku}-${cleanCol}-${sz}`,
          color: col.name,
          color_hex: col.hex,
          size: sz,
          stock: Math.floor(25 + Math.random() * 40),
          status: 'active',
        });
      });
    });
    await supabase.from('product_variants').insert(varRows);
  }

  console.log('[Supabase Seeder] Done! Database is completely seeded.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSupabaseCatalog().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
