const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQoCGmsscpn1zTCBiT2AFBr4YWW0VgLBOm5nKuYqoayTTs5gp-zAU7gLPVuP2XYMAMEu9J1v6ol2Yc/pub?output=csv'; 
const MI_WHATSAPP = '5491162338933'; 

let products = [];
let cart = [];

const CATEGORY_ICONS = {
    "todo": "🏠", "fútbol": "⚽", "ropa femenina": "👗", "ropa masculina": "👕",
    "ropa interior hombre": "🩲", "calzado femenino": "👠", "calzado unisex": "👟",
    "lencería": "👙", "default": "📦"
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

// --- VENTANA EMERGENTE (DETALLE) ---
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('product-detail-modal');
    modal.innerHTML = `
        <div class="close-overlay" onclick="closeProductDetail()"></div>
        <div class="detail-content">
            <button class="universal-close" onclick="closeProductDetail()">&times;</button>
            <div id="detail-images-container"></div>
            <div class="detail-info" style="padding:20px;">
                <h2>${product.title}</h2>
                <p><b>Categoría:</b> ${product.category}</p>
                <p class="price" style="font-size:1.5rem; color:var(--primary-color);">$${product.price}</p>
                <p>${product.descripcion || ''}</p>
                <div class="detail-actions-grid" style="display:grid; gap:10px; margin-top:20px;">
                    <button class="btn-add-detail" onclick="addToCart('${product.id}'); closeProductDetail(); toggleCart();" style="background:var(--text-color); color:var(--bg-color); padding:15px; border-radius:10px; border:none; font-weight:bold;">🛒 Agregar al Carrito</button>
                    <button class="btn-consultar" onclick="consultarWhatsApp('${product.title}')" style="background:#25D366; color:white; padding:15px; border-radius:10px; border:none; font-weight:bold;">💬 Consultar por WhatsApp</button>
                </div>
            </div>
        </div>`;

    const fotos = product.image.split(',').map(img => img.trim());
    document.getElementById('detail-images-container').innerHTML = `<img src="${fotos[0]}" style="width:100%; border-radius:15px 15px 0 0;">`;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    window.history.pushState({ modalOpen: true }, "");
}

function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function consultarWhatsApp(titulo) {
    const msg = `Hola! Me interesa este producto: *${titulo}*. ¿Tienen stock?`;
    window.open(`https://wa.me/${MI_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
}

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

function emptyCart() {
    if (confirm("¿Vaciar el carrito?")) { cart = []; updateCartUI(); }
}

function checkout() {
    if(cart.length === 0) return;
    let msg = "Hola! Mi pedido:%0A" + cart.map(i => `- ${i.tituloFinal} ($${i.price})`).join('%0A');
    window.open(`https://wa.me/${MI_WHATSAPP}?text=${msg}`, '_blank');
}

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

    // Formulario de abajo
    const contactForm = document.getElementById('whatsapp-form');
    if (contactForm) contactForm.onsubmit = (e) => {
        e.preventDefault();
        const nom = document.getElementById('nombre-contacto').value;
        const msg = document.getElementById('mensaje-contacto').value;
        window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola, soy ${nom}. ${msg}`, '_blank');
    };

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

function setupCategoryIcons() {
    document.querySelectorAll('#categories button').forEach(btn => {
        const icon = CATEGORY_ICONS[btn.innerText.toLowerCase().trim()] || "📦";
        btn.innerHTML = `<span>${icon}</span> ${btn.innerText}`;
    });
}
function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }
function moveSlider(btn, dir) { const s = btn.parentElement.querySelector('.image-slider'); s.scrollBy({ left: dir * 200, behavior: 'smooth' }); }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function filterProducts(cat) { 
    renderProducts(cat === 'todo' ? products : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase())); 
}