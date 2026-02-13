const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQoCGmsscpn1zTCBiT2AFBr4YWW0VgLBOm5nKuYqoayTTs5gp-zAU7gLPVuP2XYMAMEu9J1v6ol2Yc/pub?output=csv'; 
const MI_WHATSAPP = '5491162338933'; 

let products = [];
let cart = [];

const CATEGORY_ICONS = {
    "todo": "🏠",
    "fútbol": "⚽",
    "ropa femenina": "👗",
    "ropa masculina": "👕",
    "ropa interior hombre": "🩲",
    "calzado femenino": "👠",
    "calzado unisex": "👟",
    "lencería": "👙",
    "default": "📦"
};

// --- CARGA DE DATOS ---
async function loadProducts() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        const rows = data.split(/\r?\n/).filter(row => row.trim() !== "");
        
        products = rows.slice(1).map(row => {
            const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const rawImageField = (columns[4] || "").replace(/^"|"$/g, '').trim();

            return {
                id: columns[0]?.trim(),
                title: columns[1]?.trim(),
                price: columns[2]?.trim(),
                category: columns[3]?.trim(),
                image: rawImageField, 
                stock: columns[5]?.trim().toLowerCase(),
                variantes: columns[6]?.trim(),
                descripcion: columns[7]?.trim(),
                video: (columns[8] || "").replace(/^"|"$/g, '').trim(),
                etiqueta: columns[9]?.trim()
            };
        });
        renderProducts(products);
        setupCategoryIcons();
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

function renderProducts(list) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    list.forEach(product => {
        if(product.title && product.stock === 'si') {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.onclick = (e) => {
                if (!e.target.closest('button') && !e.target.closest('select')) {
                    openProductDetail(product.id);
                }
            };
            
            const fotos = product.image.split(',').map(img => img.trim()).filter(img => img !== "");
            let imagenesHTML = '';
            fotos.forEach(url => {
                const validUrl = url.startsWith('http') ? url : 'https://via.placeholder.com/300x300?text=Error';
                imagenesHTML += `<img src="${validUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">`;
            });

            const hayVariasFotos = fotos.length > 1;
            const botonesFlecha = hayVariasFotos ? `
                <button class="slider-btn prev" onclick="moveSlider(this, -1)">&#10094;</button>
                <button class="slider-btn next" onclick="moveSlider(this, 1)">&#10095;</button>
            ` : '';

            let etiquetaHTML = product.etiqueta ? `<span class="badge ${product.etiqueta.toLowerCase()}">${product.etiqueta}</span>` : '';

            card.innerHTML = `
                <div class="slider-container">
                    ${etiquetaHTML}
                    <div class="image-slider">${imagenesHTML}</div>
                    ${botonesFlecha}
                </div>
                <div class="info">
                    <h3>${product.title}</h3>
                    <p class="price">$${product.price}</p>
                    <div class="product-buttons">
                        <button class="btn-add" onclick="addToCart('${product.id}', event)">Agregar al Carrito</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    });
}

// --- DETALLE Y CIERRE UNIVERSAL ---
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('product-detail-modal');
    
    // Inyectar el botón de cierre directamente aquí para asegurar que exista
    modal.innerHTML = `
        <div class="close-overlay" onclick="closeProductDetail()"></div>
        <div class="detail-content">
            <button class="universal-close" onclick="closeProductDetail()">&times;</button>
            <div id="detail-images-container"></div>
            <div class="detail-info">
                <h2 id="detail-title">${product.title}</h2>
                <p class="detail-category" id="detail-category">${product.category}</p>
                <p class="detail-price" id="detail-price">$${product.price}</p>
                <p class="detail-description" id="detail-description">${product.descripcion || 'Sin descripción.'}</p>
                <div id="detail-actions"></div>
            </div>
        </div>
    `;

    // Cargar Imágenes
    const fotos = product.image.split(',').map(img => img.trim()).filter(img => img !== "");
    const imgContainer = document.getElementById('detail-images-container');
    imgContainer.innerHTML = `
        <img src="${fotos[0]}" class="detail-main-img">
        <div class="thumbnail-container">
            ${fotos.map(f => `<img src="${f}" class="thumb-img" onclick="this.parentElement.previousElementSibling.src='${f}'">`).join('')}
        </div>
    `;

    // Botones de acción
    document.getElementById('detail-actions').innerHTML = `
        <div class="detail-actions-grid">
            <button class="btn-add-detail" onclick="addToCart('${product.id}'); closeProductDetail();">🛒 Comprar Ahora</button>
            <button class="btn-share-detail" onclick="shareProduct('${product.title}')">📤 Compartir</button>
        </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
    
    // Empujar un estado al historial para que el botón "atrás" del celular cierre el modal
    window.history.pushState({ modalOpen: true }, "");
}

function closeProductDetail() {
    const modal = document.getElementById('product-detail-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Escuchar el botón "Atrás" del celular
window.onpopstate = function() {
    closeProductDetail();
};

function shareProduct(title) {
    const text = `Mira este producto en Geminis SurTienda: ${title}`;
    if (navigator.share) {
        navigator.share({ title: title, text: text, url: window.location.href });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + window.location.href)}`);
    }
}

// --- MODO OSCURO ---
function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) applyTheme(savedTheme);

    const style = document.createElement('style');
    style.innerHTML = `
        #product-detail-modal { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            z-index: 99999; display: flex; align-items: center; justify-content: center;
        }
        .close-overlay { 
            position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.8); 
        }
        .detail-content { 
            position: relative; background: white; width: 90%; max-width: 500px; 
            max-height: 85vh; overflow-y: auto; border-radius: 20px; z-index: 100000;
        }
        [data-theme="dark"] .detail-content { background: #1a1a1a; color: white; }
        
        .universal-close {
            position: sticky; top: 10px; left: 85%;
            width: 40px; height: 40px; background: #ff4757; color: white;
            border: none; border-radius: 50%; font-size: 24px; font-weight: bold;
            z-index: 100001; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .detail-actions-grid { display: grid; gap: 10px; padding: 20px; }
        .btn-add-detail { background: #25D366; color: white; border: none; padding: 15px; border-radius: 10px; font-weight: bold; }
        .btn-share-detail { background: #3498db; color: white; border: none; padding: 15px; border-radius: 10px; font-weight: bold; }
    `;
    document.head.appendChild(style);
});

// --- OTRAS FUNCIONES ---
function setupCategoryIcons() {
    document.querySelectorAll('#categories button').forEach(btn => {
        const text = btn.innerText.toLowerCase().trim();
        const icon = CATEGORY_ICONS[text] || CATEGORY_ICONS["default"];
        btn.innerHTML = `<span>${icon}</span> ${btn.innerText}`;
    });
}
function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }
function moveSlider(btn, dir) { const c = btn.parentElement.querySelector('.image-slider'); c.scrollBy({ left: dir * c.clientWidth, behavior: 'smooth' }); }
function filterProducts(cat) { 
    if (cat === 'todo') renderProducts(products);
    else renderProducts(products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()));
}
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if(product) {
        cart.push(product);
        updateCartUI();
        alert("¡Agregado al carrito!");
    }
}
function updateCartUI() {
    const count = document.getElementById('cart-count');
    if(count) count.innerText = cart.length;
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }