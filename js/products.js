let products = [];

// Fallback data used if Firebase is unavailable
const fallbackProducts = [
    {
        id: 1,
        name: "La Vie Est Belle Eau de Parfum",
        brand: "Lancôme",
        price: 345.000,
        category: "Parfum",
        image: "assets/eau-de-parfum-lancome-la-vie-est-belle.webp",
        isNew: true
    },
    {
        id: 2,
        name: "Rouge Dior Lipstick",
        brand: "Dior",
        price: 145.000,
        category: "Maquillage",
        image: "assets/rouge dior.jpg",
        isNew: true
    },
    {
        id: 3,
        name: "Advanced Night Repair",
        brand: "Estée Lauder",
        price: 420.000,
        category: "Soin",
        image: "assets/Advanced Night Repair.jpg",
        isNew: false
    },
    {
        id: 4,
        name: "Black Opium Eau de Parfum",
        brand: "Yves Saint Laurent",
        price: 380.000,
        category: "Parfum",
        image: "assets/Black Opium Eau de Parfum.jpg",
        isNew: true
    },
    {
        id: 5,
        name: "Terracotta Poudre Bronzante",
        brand: "Guerlain",
        price: 190.000,
        category: "Maquillage",
        image: "assets/Terracotta Poudre Bronzante.jpg",
        isNew: false
    },
    {
        id: 6,
        name: "Coco Mademoiselle",
        brand: "Chanel",
        price: 490.000,
        category: "Parfum",
        image: "assets/Coco Mademoiselle.webp",
        isNew: false
    },
    {
        id: 7,
        name: "Double Wear Foundation",
        brand: "Estée Lauder",
        price: 210.000,
        category: "Maquillage",
        image: "assets/Double Wear Foundation.jpg",
        isNew: true
    },
    {
        id: 8,
        name: "Sauvage Eau de Toilette",
        brand: "Dior",
        price: 360.000,
        category: "Parfum",
        image: "assets/Sauvage Eau de Toilette.jpg",
        isNew: false
    }
];

async function loadProducts() {
    if (products.length) return products;

    // Try to load from Firebase Firestore first
    try {
        if (typeof db !== 'undefined') {
            const snapshot = await db.collection('products').get();
            if (!snapshot.empty) {
                products = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('Produits chargés depuis Firebase:', products.length);
                return products;
            }
        }
    } catch (error) {
        console.warn('Firebase indisponible, essai API locale...', error);
    }

    // Fallback to PHP API
    try {
        const response = await fetch('/api/products.php', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length) {
            products = data;
            return products;
        }
    } catch (error) {
        console.warn('API produits indisponible, utilisation du fallback local.', error);
    }

    // Final fallback to static data
    products = fallbackProducts;
    return products;
}
