const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQoCGmsscpn1zTCBiT2AFBr4YWW0VgLBOm5nKuYqoayTTs5gp-zAU7gLPVuP2XYMAMEu9J1v6ol2Yc/pub?output=csv'; 
const MI_WHATSAPP = '5491162338933'; 

let products = [];
let cart = [];

const CATEGORY_ICONS = {
    "todo": "🏠",
    "lenceria": "👙",
    "bombachas": "👙",
    "conjuntos": "✨",
    "pijamas": "🌙",
    "ofertas": "🔥",
    "medias": "🧦",
    "default": "📦"
};

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
                const validUrl = url.startsWith('http') ? url : 'https://via.placeholder.com/300x300?text=Error+Link';
                imagenesHTML += `<img src="${validUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">`;
            });

            const hayVariasFotos = fotos.length > 1;
            const botonesFlecha = hayVariasFotos ? `
                <button class="slider-btn prev" onclick="moveSlider(this, -1)">&#10094;</button>
                <button class="slider-btn next" onclick="moveSlider(this, 1)">&#10095;</button>
            ` : '';

            let etiquetaHTML = '';
            if (product.etiqueta && product.etiqueta.trim() !== "") {
                etiquetaHTML = `<span class="badge ${product.etiqueta.toLowerCase()}">${product.etiqueta}</span>`;
            }

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
                    <div class="image-slider">
                        ${imagenesHTML}
                    </div>
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

function moveSlider(btn, direction) {
    const container = btn.parentElement.querySelector('.image-slider');
    const scrollAmount = container.clientWidth;
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// --- DETALLE DE PRODUCTO CON ZOOM CORREGIDO ---
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById('product-detail-modal');
    document.getElementById('detail-title').innerText = product.title;
    document.getElementById('detail-price').innerText = `$${product.price}`;
    document.getElementById('detail-category').innerText = product.category;
    document.getElementById('detail-description').innerText = product.descripcion || 'Sin descripción disponible.';
    
    const modalContent = modal.querySelector('.modal-content') || modal.querySelector('.detail-content');
    if(modalContent) modalContent.scrollTop = 0;

    const fotos = product.image.split(',').map(img => img.trim()).filter(img => img !== "");
    const container = document.getElementById('detail-images-container');
    
    container.innerHTML = `
        <div class="zoom-wrapper" id="zoom-container" style="overflow: hidden; position: relative; cursor: zoom-in;">
            <img src="${fotos[0]}" class="detail-main-img" id="zoom-img" style="width: 100%; transition: transform 0.2s ease-out; transform-origin: center;">
        </div>
        <div class="thumbnail-container">
            ${fotos.map((f, index) => `
                <img src="${f}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="changeDetailImage(this, '${f}')">
            `).join('')}
        </div>
    `;

    // ACTIVACIÓN DEL ZOOM
    const zoomContainer = document.getElementById('zoom-container');
    const zoomImg = document.getElementById('zoom-img');

    if (window.innerWidth > 768) {
        zoomContainer.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = zoomContainer.getBoundingClientRect();
            const x = ((e.pageX - left - window.scrollX) / width) * 100;
            const y = ((e.pageY - top - window.scrollY) / height) * 100;
            zoomImg.style.transformOrigin = `${x}% ${y}%`;
            zoomImg.style.transform = "scale(2.5)";
        });

        zoomContainer.addEventListener('mouseleave', () => {
            zoomImg.style.transform = "scale(1)";
        });
    }

    const actionContainer = document.getElementById('detail-actions');
    actionContainer.innerHTML = `
        <div class="detail-actions-grid">
            <button class="btn-add-detail" id="btn-add-detail">🛒 Agregar al Carrito</button>
            <button class="btn-consultar" id="btn-consult-detail">💬 Consultar por WhatsApp</button>
            <button class="btn-share-detail" id="btn-share-detail">📤 Compartir Producto</button>
        </div>
    `;
    
    document.getElementById('btn-add-detail').onclick = () => { addToCart(product.id); closeProductDetail(); toggleCart(); };
    document.getElementById('btn-consult-detail').onclick = () => {
        const mensaje = `Hola! Me interesa este producto de tu web:\n*${product.title}*\nPrecio: $${product.price}\n¿Tienen stock?`;
        window.open(`https://wa.me/${MI_WHATSAPP}?text=${encodeURIComponent(mensaje)}`, '_blank');
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
}

function changeDetailImage(thumb, src) {
    const mainImg = document.getElementById('zoom-img');
    mainImg.src = src;
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function filterProducts(category, btnElement) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (category === 'todo') renderProducts(products);
    else {
        const filtered = products.filter(p => p.category?.toLowerCase().trim() === category.toLowerCase().trim());
        renderProducts(filtered);
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) applyTheme(savedTheme);
    else if (systemPrefersDark) applyTheme('dark');

    const btnTheme = document.getElementById('dark-mode-toggle');
    if(btnTheme) {
        btnTheme.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    const welcomeModal = document.getElementById('welcome-modal');
    if (!sessionStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            if (welcomeModal) {
                welcomeModal.classList.remove('hidden');
                welcomeModal.style.display = 'flex';
            }
        }, 800);
    }

    const style = document.createElement('style');
    style.innerHTML = `
        .category-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; font-size: 1.1rem; font-weight: bold; border-radius: 25px; cursor: pointer; transition: 0.3s; background: var(--card-bg); color: var(--text-color); border: 2px solid var(--border-color); }
        .category-btn.active { background: #000; color: #fff; border-color: var(--accent-color); transform: scale(1.05); }
        [data-theme="dark"] .category-btn.active { background: #fff; color: #000; }
        
        .detail-actions-grid { display: grid; gap: 10px; margin-top: 20px; }
        .btn-add-detail { background: var(--header-bg); color: #fff; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; }
        .btn-consultar { background: #25D366; color: #fff; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; }
        .btn-share-detail { background: #3498db; color: #fff; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; }
        
        .btn-empty { background-color: #e74c3c; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 15px; width: 100%; transition: 0.3s; }
        .btn-empty:hover { background-color: #c0392b; }

        .close-modal-fixed { position: sticky; top: 0; align-self: flex-end; background: #000; color: #fff; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; z-index: 2000; cursor: pointer; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-bottom: -40px; margin-right: -10px; }
        [data-theme="dark"] #welcome-modal .welcome-content { background: #1a1a1a; color: #fff; border: 1px solid #333; }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.category-btn').forEach(btn => {
        const text = btn.innerText.toLowerCase().trim();
        const icon = CATEGORY_ICONS[text] || CATEGORY_ICONS["default"];
        btn.innerHTML = `<span>${icon}</span> ${btn.innerText}`;
    });

    const detailContent = document.querySelector('.detail-content');
    if (detailContent) {
        const closeBtn = document.createElement('div');
        closeBtn.className = 'close-modal-fixed';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = closeProductDetail;
        detailContent.prepend(closeBtn);
    }
});

function addToCart(id, event) {
    const product = products.find(p => p.id === id);
    if(product) {
        const selectEl = document.getElementById(`select-${id}`);
        const varianteSeleccionada = selectEl ? selectEl.value : null;
        const prod = {...product, tituloConVariante: varianteSeleccionada ? `${product.title} (${varianteSeleccionada})` : product.title};
        cart.push(prod);
        updateCartUI();
        if (event && event.target) {
            const b = event.target; b.innerText = "✅ Agregado";
            setTimeout(() => b.innerText = "Agregar al Carrito", 1000);
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
        return `<li style="display:flex;justify-content:space-between;margin-bottom:10px">
            <span>${item.tituloConVariante}</span><span>$${p.toLocaleString('es-AR')}</span>
        </li>`;
    }).join('');
    const totalEl = document.getElementById('cart-total');
    if(totalEl) totalEl.innerText = total.toLocaleString('es-AR');
}

function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }

function emptyCart() {
    if (cart.length === 0) {
        alert("El carrito ya está vacío");
        return;
    }
    if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) {
        cart = [];
        updateCartUI();
        setTimeout(() => toggleCart(), 500);
    }
}

function checkout() {
    if(cart.length === 0) return;
    let msg = "Hola! Mi pedido de *Geminis SurTienda*:%0A%0A";
    let t = 0;
    cart.forEach(i => {
        const p = parseFloat(i.price.toString().replace(/[$.]/g, '').replace(',', '.')) || 0;
        msg += `• ${i.tituloConVariante} - $${p.toLocaleString('es-AR')}%0A`;
        t += p;
    });
    msg += `%0A*Total: $${t.toLocaleString('es-AR')}*`;
    window.open(`https://wa.me/${MI_WHATSAPP}?text=${msg}`, '_blank');
}

function closeWelcome() {
    const m = document.getElementById('welcome-modal');
    if(m) { m.classList.add('hidden'); m.style.display = 'none'; }
    sessionStorage.setItem('welcomeShown', 'true');
}

function searchProducts() {
    const term = document.getElementById('product-search').value.toLowerCase();
    const filtered = products.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.category.toLowerCase().includes(term)
    );
    renderProducts(filtered);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
window.onscroll = () => {
    const b = document.getElementById("btn-scroll-top");
    if(b) b.style.display = (window.scrollY > 300) ? "flex" : "none";
};