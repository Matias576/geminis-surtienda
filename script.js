const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQoCGmsscpn1zTCBiT2AFBr4YWW0VgLBOm5nKuYqoayTTs5gp-zAU7gLPVuP2XYMAMEu9J1v6ol2Yc/pub?output=csv'; 
const MI_WHATSAPP = '5491162338933'; 

let products = [];
let cart = [];

const CATEGORY_ICONS = {
    "todo": "🏠", "fútbol": "⚽", "ropa femenina": "👗", "ropa masculina": "👕",
    "ropa interior hombre": "🩲", "calzado femenino": "👠", "calzado unisex": "👟",
    "lencería": "👙", "default": "📦" , "zapatilla femenina": "👟"
};

// --- CARGA DE DATOS ---
async function loadProducts() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        const rows = data.split(/\r?\n/).filter(row => row.trim() !== "");
        
        products = rows.slice(1).map(row => {
            const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                id: columns[0]?.trim(),
                title: columns[1]?.trim(),
                price: columns[2]?.trim(),
                category: columns[3]?.trim(),
                image: (columns[4] || "").replace(/^"|"$/g, '').trim(), 
                stock: columns[5]?.trim().toLowerCase(),
                variantes: columns[6]?.trim(),
                descripcion: columns[7]?.trim(),
                video: (columns[8] || "").replace(/^"|"$/g, '').trim(),
                etiqueta: columns[9]?.trim()
            };
        });
        renderProducts(products);
        setupCategoryIcons();
    } catch (error) { console.error("Error:", error); }
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
                if (!e.target.closest('button') && !e.target.closest('select')) openProductDetail(product.id);
            };
            
            const fotos = product.image.split(',').map(img => img.trim());
            let imagenesHTML = fotos.map(url => `<img src="${url}" class="product-img" onerror="this.src='https://via.placeholder.com/300'">`).join('');

            let variantesHTML = '';
            if (product.variantes) {
                const opciones = product.variantes.split(',');
                variantesHTML = `<select id="select-${product.id}" class="select-variante">` + 
                                opciones.map(opt => `<option value="${opt.trim()}">${opt.trim()}</option>`).join('') + `</select>`;
            }

            card.innerHTML = `
                <div class="slider-container">
                    <div class="image-slider">${imagenesHTML}</div>
                    ${fotos.length > 1 ? '<button class="slider-btn prev" onclick="moveSlider(this, -1)">&#10094;</button><button class="slider-btn next" onclick="moveSlider(this, 1)">&#10095;</button>' : ''}
                </div>
                <div class="info">
                    <h3>${product.title}</h3>
                    <p class="price">$${product.price}</p>
                    ${variantesHTML}
                    <button class="btn-add" onclick="addToCart('${product.id}', event)">Agregar al Carrito</button>
                </div>`;
            grid.appendChild(card);
        }
    });
}

// --- VENTANA EMERGENTE (DETALLE MEJORADO) ---
// --- VENTANA EMERGENTE (DETALLE CORREGIDO) ---
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('product-detail-modal');

    let variantesHTMLModal = '';
    if (product.variantes) {
        const opciones = product.variantes.split(',');
        variantesHTMLModal = `<div style="margin: 10px 0;">
            <label style="font-weight:bold; font-size:0.9rem;">Seleccionar Variante/Talle:</label>
            <select id="modal-select-${product.id}" class="select-variante" style="margin-top:5px; border:2px solid var(--border-color);">` + 
            opciones.map(opt => `<option value="${opt.trim()}">${opt.trim()}</option>`).join('') + 
            `</select></div>`;
    }

    modal.innerHTML = `
        <div class="close-overlay" onclick="closeProductDetail()"></div>
        <div class="detail-content">
            <button class="universal-close" onclick="closeProductDetail()">&times;</button>
            <div id="detail-images-container"></div>
            <div class="detail-info" style="padding:20px;">
                <h2>${product.title}</h2>
                <p><b>Categoría:</b> ${product.category}</p>
                <p class="price" style="font-size:1.5rem; color:var(--primary-color);">$${product.price}</p>
                
                ${variantesHTMLModal}

                <p style="margin-top:15px;">${product.descripcion || ''}</p>
                
                <div class="detail-actions-grid" style="display:grid; gap:10px; margin-top:20px;">
                    <button class="btn-add-detail" onclick="addToCartFromModal('${product.id}')" style="background:var(--text-color); color:var(--bg-color); padding:15px; border-radius:10px; border:none; font-weight:bold;">🛒 Agregar al Carrito</button>
                    <button class="btn-consultar" onclick="consultarWhatsApp('${product.title}')" style="background:#25D366; color:white; padding:15px; border-radius:10px; border:none; font-weight:bold;">💬 Consultar por WhatsApp</button>
                    <button class="btn-share" onclick="compartirProducto('${product.title}')" style="background:#3498db; color:white; padding:15px; border-radius:10px; border:none; font-weight:bold;">📤 Compartir Producto</button>
                </div>
            </div>
        </div>`;

    // --- LÓGICA DE IMÁGENES (CORRECCIÓN AQUÍ) ---
    const fotos = product.image.split(',').map(img => img.trim());
    
    // 1. Imagen principal
    let imagesHTML = `<img id="main-detail-img" src="${fotos[0]}" class="detail-main-img" onerror="this.src='https://via.placeholder.com/300'">`;
    
    // 2. Galería de miniaturas (si hay más de una foto)
    if (fotos.length > 1) {
        imagesHTML += `<div class="thumbnail-container" style="display:flex; gap:10px; margin-top:10px; overflow-x:auto;">`;
        fotos.forEach((img, index) => {
            imagesHTML += `<img src="${img}" class="thumb-img ${index === 0 ? 'active' : ''}" 
                           onclick="changeModalImage('${img}', this)" 
                           style="width:60px; height:60px; object-fit:cover; border-radius:8px; cursor:pointer; border:2px solid ${index === 0 ? 'var(--accent-color)' : 'transparent'}">`;
        });
        imagesHTML += `</div>`;
    }

    document.getElementById('detail-images-container').innerHTML = imagesHTML;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    window.history.pushState({ modalOpen: true }, "");
}

// NUEVA FUNCIÓN NECESARIA: Para cambiar la foto principal al tocar una miniatura
window.changeModalImage = function(src, element) {
    const mainImg = document.getElementById('main-detail-img');
    if(mainImg) mainImg.src = src;
    
    // Actualizar bordes de miniaturas
    const thumbs = element.parentElement.querySelectorAll('img');
    thumbs.forEach(t => t.style.borderColor = 'transparent');
    element.style.borderColor = 'var(--accent-color)';
};

function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// --- FUNCIONES WHATSAPP Y COMPARTIR SEGURAS ---
function abrirWhatsAppSeguro(mensaje) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const waUrl = `https://wa.me/${MI_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    if (isMobile) {
        window.location.href = waUrl; // En celular evita bloqueos de ventanas emergentes
    } else {
        window.open(waUrl, '_blank'); // En PC abre pestaña nueva
    }
}

function consultarWhatsApp(titulo) {
    abrirWhatsAppSeguro(`Hola! Me interesa este producto: *${titulo}*. ¿Tienen stock?`);
}

function compartirProducto(titulo) {
    const texto = `Mira este producto en Geminis SurTienda: *${titulo}*`;
    const url = window.location.href;
    
    if (navigator.share) {
        // Funciona en Celulares
        navigator.share({ title: titulo, text: texto, url: url }).catch(err => console.log('Error al compartir', err));
    } else {
        // Alternativa si estás en PC (Abre WhatsApp Web)
        abrirWhatsAppSeguro(texto + " " + url);
    }
}

// --- BUSCADOR ---
window.searchProducts = function() {
    const term = document.getElementById('product-search').value.toLowerCase();
    renderProducts(products.filter(p => p.title.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term))));
};

// --- MODO OSCURO ---
function applyTheme(theme) {
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if(icon) icon.innerText = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if(icon) icon.innerText = '🌙';
    }
}

// --- CARRITO ---
function addToCart(id, event) {
    const product = products.find(p => p.id === id);
    if(product) {
        const select = document.getElementById(`select-${id}`);
        const variante = select ? select.value : null;
        cart.push({...product, tituloFinal: variante ? `${product.title} (Talle: ${variante})` : product.title});
        updateCartUI();
        if(event) { event.target.innerText = "✅ Agregado"; setTimeout(() => event.target.innerText = "Agregar al Carrito", 1000); }
    }
}

// Función especial para agregar desde la ventana emergente leyendo el talle de ahí
function addToCartFromModal(id) {
    const product = products.find(p => p.id === id);
    if(product) {
        const select = document.getElementById(`modal-select-${id}`);
        const variante = select ? select.value : null;
        cart.push({...product, tituloFinal: variante ? `${product.title} (Talle: ${variante})` : product.title});
        updateCartUI();
        closeProductDetail();
        toggleCart();
    }
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const items = document.getElementById('cart-items');
    let total = 0;
    items.innerHTML = cart.map((item, index) => {
        const p = parseFloat(item.price.replace(/[$.]/g, '').replace(',', '.')) || 0;
        total += p;
        return `<li>${item.tituloFinal} - $${item.price}</li>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString('es-AR');
}

window.emptyCart = function() {
    if (cart.length === 0) return alert("El carrito ya está vacío.");
    if (confirm("¿Seguro que deseas vaciar el carrito?")) { 
        cart = []; 
        updateCartUI(); 
    }
};

window.checkout = function() {
    if(cart.length === 0) return alert("Tu carrito está vacío.");
    let msg = "Hola! Mi pedido en Geminis SurTienda:%0A%0A";
    let total = 0;
    cart.forEach(i => {
        msg += `• ${i.tituloFinal} ($${i.price})%0A`;
        total += parseFloat(i.price.replace(/[$.]/g, '').replace(',', '.')) || 0;
    });
    msg += `%0A*Total: $${total.toLocaleString('es-AR')}*`;
    
    abrirWhatsAppSeguro(msg);
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    // Modo Oscuro
    const btnTheme = document.getElementById('dark-mode-toggle');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) applyTheme(savedTheme);
    if(btnTheme) btnTheme.onclick = () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // Formulario de Contacto (Abajo de todo)
    const contactForm = document.getElementById('whatsapp-form');
    if (contactForm) {
        contactForm.onsubmit = (e) => {
            e.preventDefault();
            const nom = document.getElementById('nombre-contacto').value;
            const asu = document.getElementById('asunto-contacto').value;
            const msg = document.getElementById('mensaje-contacto').value;
            
            const textoFinal = `Hola Geminis SurTienda! Soy ${nom}.%0A*Consulta por:* ${asu}%0A*Mensaje:* ${msg}`;
            abrirWhatsAppSeguro(textoFinal);
        };
    }

    // Estilos necesarios para la flecha y el modal
    const style = document.createElement('style');
    style.innerHTML = `
        .scroll-top-btn.hidden { opacity: 0; visibility: hidden; }
        .close-overlay { position: absolute; width:100%; height:100%; background:rgba(0,0,0,0.7); }
        .universal-close { position: sticky; top: 10px; left: 90%; background: #ff4757; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 20px; z-index: 100; cursor: pointer; }
    `;
    document.head.appendChild(style);
});

// --- GLOBALES ---
window.onscroll = () => {
    const btn = document.getElementById("btn-scroll-top");
    if (btn) {
        if (window.scrollY > 300) btn.classList.remove("hidden");
        else btn.classList.add("hidden");
    }
};

window.onpopstate = () => closeProductDetail();

window.setupCategoryIcons = function() {
    document.querySelectorAll('#categories button').forEach(btn => {
        const icon = CATEGORY_ICONS[btn.innerText.toLowerCase().trim()] || "📦";
        btn.innerHTML = `<span>${icon}</span> ${btn.innerText}`;
    });
};

window.toggleCart = function() { document.getElementById('cart-modal').classList.toggle('hidden'); };
window.moveSlider = function(btn, dir) { const s = btn.parentElement.querySelector('.image-slider'); s.scrollBy({ left: dir * 200, behavior: 'smooth' }); };
window.scrollToTop = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
window.filterProducts = function(cat) { 
    renderProducts(cat === 'todo' ? products : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase())); 
};