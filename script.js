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

            let variantesHTML = '';
            if (product.variantes && product.variantes.trim() !== "") {
                const opciones = product.variantes.split(',');
                variantesHTML = `<select id="select-${product.id}" class="select-variante">`;
                opciones.forEach(opt => {
                    variantesHTML += `<option value="${opt.trim()}">${opt.trim()}</option>`;
                });
                variantesHTML += `</select>`;
            }

            card.innerHTML = `
                <div class="slider-container">
                    ${etiquetaHTML}
                    <div class="image-slider">${imagenesHTML}</div>
                    ${botonesFlecha}
                </div>
                <div class="info">
                    <h3>${product.title}</h3>
                    <p class="price">$${product.price}</p>
                    ${variantesHTML}
                    <div class="product-buttons">
                        <button class="btn-add" onclick="addToCart('${product.id}', event)">Agregar al Carrito</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    });
}

// --- DETALLE, ZOOM Y CIERRE MEJORADO ---
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('product-detail-modal');
    document.getElementById('detail-title').innerText = product.title;
    document.getElementById('detail-price').innerText = `$${product.price}`;
    document.getElementById('detail-category').innerText = product.category;
    document.getElementById('detail-description').innerText = product.descripcion || 'Sin descripción disponible.';
    
    const fotos = product.image.split(',').map(img => img.trim()).filter(img => img !== "");
    const container = document.getElementById('detail-images-container');
    
    container.innerHTML = `
        <div class="zoom-wrapper" id="zoom-container" style="overflow: hidden; position: relative; cursor: zoom-in;">
            <img src="${fotos[0]}" class="detail-main-img" id="zoom-img" style="width: 100%; transition: transform 0.2s ease-out; transform-origin: center;">
        </div>
        <div class="thumbnail-container">
            ${fotos.map((f, index) => `<img src="${f}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="changeDetailImage(this, '${f}')">`).join('')}
        </div>
    `;

    // Botones de acción
    const actionContainer = document.getElementById('detail-actions');
    actionContainer.innerHTML = `
        <div class="detail-actions-grid">
            <button class="btn-add-detail" onclick="addToCart('${product.id}'); closeProductDetail(); toggleCart();">🛒 Agregar al Carrito</button>
            <button class="btn-consultar" id="btn-wa-detail">💬 Consultar por WhatsApp</button>
            <button class="btn-share-detail" id="btn-share-detail">📤 Compartir Producto</button>
        </div>
    `;
    
    document.getElementById('btn-wa-detail').onclick = () => {
        const msg = `Hola! Me interesa: *${product.title}* ($${product.price}). ¿Tienen stock?`;
        window.open(`https://wa.me/${MI_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    document.getElementById('btn-share-detail').onclick = () => {
        const shareText = `Mira este producto en Geminis SurTienda: *${product.title}* - $${product.price}`;
        if (navigator.share) {
            navigator.share({ title: product.title, text: shareText, url: window.location.href });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + window.location.href)}`, '_blank');
        }
    };

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 

    // CERRAR AL TOCAR AFUERA (Para celulares)
    modal.onclick = (e) => {
        if (e.target === modal) closeProductDetail();
    };
}

function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// --- MODO OSCURO ---
function applyTheme(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.innerText = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.innerText = '🌙';
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    const btnTheme = document.getElementById('dark-mode-toggle');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) applyTheme(savedTheme);

    if(btnTheme) {
        btnTheme.onclick = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        };
    }

    const contactForm = document.getElementById('whatsapp-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nom = document.getElementById('nombre-contacto').value;
            const asu = document.getElementById('asunto-contacto').value;
            const msg = document.getElementById('mensaje-contacto').value;
            const texto = `Hola Geminis SurTienda!%0A*Nombre:* ${nom}%0A*Asunto:* ${asu}%0A*Mensaje:* ${msg}`;
            window.open(`https://wa.me/${MI_WHATSAPP}?text=${texto}`, '_blank');
        });
    }

    // ESTILOS DE EMERGENCIA PARA CIERRE EN CELULARES
    const style = document.createElement('style');
    style.innerHTML = `
        #product-detail-modal { background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; }
        .detail-content { position: relative; max-height: 90vh; overflow-y: auto; border-radius: 15px; }
        .close-detail { 
            position: fixed; top: 15px; right: 15px; 
            background: #ff4757; color: white; 
            width: 45px; height: 45px; border-radius: 50%; 
            font-size: 28px; border: 2px solid white; 
            z-index: 9999; cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        }
        .detail-actions-grid { display: grid; gap: 10px; margin-top: 20px; padding-bottom: 20px; }
        .btn-add-detail { background: #000; color: #fff; padding: 15px; border-radius: 10px; border: none; font-weight: bold; }
        .btn-consultar { background: #25D366; color: #fff; padding: 15px; border-radius: 10px; border: none; font-weight: bold; }
        .btn-share-detail { background: #3498db; color: #fff; padding: 15px; border-radius: 10px; border: none; font-weight: bold; }
        #categories button span { margin-right: 5px; }
        .scroll-top-btn.hidden { opacity: 0; visibility: hidden; }
    `;
    document.head.appendChild(style);
});

// --- FUNCIONES GLOBALES ---
window.onscroll = () => {
    const btnScroll = document.getElementById("btn-scroll-top");
    if (btnScroll) {
        if (window.scrollY > 300) btnScroll.classList.remove("hidden");
        else btnScroll.classList.add("hidden");
    }
};

function setupCategoryIcons() {
    document.querySelectorAll('#categories button').forEach(btn => {
        const text = btn.innerText.toLowerCase().trim();
        const icon = CATEGORY_ICONS[text] || CATEGORY_ICONS["default"];
        btn.innerHTML = `<span>${icon}</span> ${btn.innerText}`;
    });
}
function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }
function changeDetailImage(thumb, src) { document.getElementById('zoom-img').src = src; document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active')); thumb.classList.add('active'); }
function moveSlider(btn, dir) { const c = btn.parentElement.querySelector('.image-slider'); c.scrollBy({ left: dir * c.clientWidth, behavior: 'smooth' }); }
function filterProducts(cat) { 
    if (cat === 'todo') renderProducts(products);
    else renderProducts(products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()));
}
function searchProducts() {
    const term = document.getElementById('product-search').value.toLowerCase();
    renderProducts(products.filter(p => p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)));
}
function addToCart(id, event) {
    const product = products.find(p => p.id === id);
    if(product) {
        const selectEl = document.getElementById(`select-${id}`);
        const variante = selectEl ? selectEl.value : null;
        cart.push({...product, tituloConVariante: variante ? `${product.title} (${variante})` : product.title});
        updateCartUI();
        if (event?.target) {
            event.target.innerText = "✅ Agregado";
            setTimeout(() => event.target.innerText = "Agregar al Carrito", 1000);
        }
    }
}
function updateCartUI() {
    const count = document.getElementById('cart-count');
    if(count) count.innerText = cart.length;
    const items = document.getElementById('cart-items');
    if(!items) return;
    let total = 0;
    items.innerHTML = cart.map(item => {
        const p = parseFloat(item.price.toString().replace(/[$.]/g, '').replace(',', '.')) || 0;
        total += p;
        return `<li><span>${item.tituloConVariante}</span><span>$${p.toLocaleString('es-AR')}</span></li>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString('es-AR');
}
function emptyCart() {
    if (cart.length === 0) return alert("El carrito ya está vacío");
    if (confirm("¿Vaciar todo el carrito?")) {
        cart = []; updateCartUI();
        setTimeout(toggleCart, 500);
    }
}
function checkout() {
    if(cart.length === 0) return;
    let msg = "Hola! Mi pedido de *Geminis SurTienda*:%0A%0A";
    let total = 0;
    cart.forEach(i => {
        const p = parseFloat(i.price.toString().replace(/[$.]/g, '').replace(',', '.')) || 0;
        msg += `• ${i.tituloConVariante} - $${p.toLocaleString('es-AR')}%0A`;
        total += p;
    });
    msg += `%0A*Total: $${total.toLocaleString('es-AR')}*`;
    window.open(`https://wa.me/${MI_WHATSAPP}?text=${msg}`, '_blank');
}
function closeWelcome() { document.getElementById('welcome-modal').classList.add('hidden'); sessionStorage.setItem('welcomeShown', 'true'); }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }