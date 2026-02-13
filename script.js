const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQoCGmsscpn1zTCBiT2AFBr4YWW0VgLBOm5nKuYqoayTTs5gp-zAU7gLPVuP2XYMAMEu9J1v6ol2Yc/pub?output=csv'; 
const MI_WHATSAPP = '5491162338933'; 

let products = [];
let cart = [];

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

// --- FUNCIÓN DE DETALLE ACTUALIZADA CON ZOOM, MINIATURAS Y COMPARTIR ---
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('detail-title').innerText = product.title;
    document.getElementById('detail-price').innerText = `$${product.price}`;
    document.getElementById('detail-category').innerText = product.category;
    document.getElementById('detail-description').innerText = product.descripcion || 'Sin descripción disponible.';
    
    const fotos = product.image.split(',').map(img => img.trim()).filter(img => img !== "");
    const container = document.getElementById('detail-images-container');
    
    // Inyectar HTML para imagen principal (con zoom) y miniaturas
    container.innerHTML = `
        <div class="zoom-wrapper" id="zoom-container">
            <img src="${fotos[0]}" class="detail-main-img" id="zoom-img">
        </div>
        <div class="thumbnail-container">
            ${fotos.map((f, index) => `
                <img src="${f}" 
                     class="thumb-img ${index === 0 ? 'active' : ''}" 
                     onclick="changeDetailImage(this, '${f}')"
                     onerror="this.src='https://via.placeholder.com/60x60?text=Sin+Imagen'">
            `).join('')}
        </div>
    `;

    const zoomContainer = document.getElementById('zoom-container');
    const img = document.getElementById('zoom-img');

    // Lógica de Zoom
    zoomContainer.onmousemove = (e) => {
        const rect = zoomContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        img.style.transformOrigin = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
        img.style.transform = "scale(2.5)";
    };

    zoomContainer.onmouseleave = () => {
        img.style.transform = "scale(1)";
        img.style.transformOrigin = "center center";
    };

    // Agregar botones: "Agregar al pedido" y "Compartir"
    const actionContainer = document.getElementById('detail-actions');
    actionContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
            <button class="btn-whatsapp" id="btn-add-detail">🛒 Agregar al pedido</button>
            <button class="btn-share" id="btn-share-detail" style="background-color: #3498db; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">📤 Compartir Producto</button>
        </div>
    `;
    
    document.getElementById('btn-add-detail').onclick = () => {
        addToCart(product.id);
        closeProductDetail();
        toggleCart();
    };

    // Lógica de Compartir
    document.getElementById('btn-share-detail').onclick = () => {
        const shareText = `¡Mira este producto en Geminis SurTienda!\n\n*${product.title}*\nPrecio: $${product.price}\n\nVer catálogo: ${window.location.href}`;
        if (navigator.share) {
            navigator.share({ title: product.title, text: shareText, url: window.location.href }).catch(console.error);
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
    };

    document.getElementById('product-detail-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
}

// Función para cambiar imagen al clickear miniaturas
function changeDetailImage(thumb, src) {
    document.getElementById('zoom-img').src = src;
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function addToCart(id, event) {
    const product = products.find(p => p.id === id);
    if(product) {
        const selectEl = document.getElementById(`select-${id}`);
        const varianteSeleccionada = selectEl ? selectEl.value : null;
        const productoParaCarrito = {
            ...product,
            tituloConVariante: varianteSeleccionada ? `${product.title} (${varianteSeleccionada})` : product.title
        };
        cart.push(productoParaCarrito);
        updateCartUI();
        if (event && event.target) {
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = "✅ Agregado";
            btn.style.pointerEvents = "none";
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.pointerEvents = "auto";
            }, 1000);
        }
    }
}

function updateCartUI() {
    const cartCountEl = document.getElementById('cart-count');
    if(cartCountEl) cartCountEl.innerText = cart.length;
    const cartItems = document.getElementById('cart-items');
    if(!cartItems) return;
    let total = 0;
    cartItems.innerHTML = '';
    cart.forEach((item) => {
        const precioLimpio = parseFloat(item.price.toString().replace(/[$.]/g, '').replace(',', '.')) || 0;
        total += precioLimpio;
        const li = document.createElement('li');
        li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.marginBottom = "10px";
        li.innerHTML = `<span>${item.tituloConVariante}</span><span>$${precioLimpio.toLocaleString('es-AR')}</span>`;
        cartItems.appendChild(li);
    });
    const totalEl = document.getElementById('cart-total');
    if(totalEl) totalEl.innerText = total.toLocaleString('es-AR');
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if(modal) modal.classList.toggle('hidden');
}

function emptyCart() {
    if (cart.length === 0) return;
    if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
        cart = []; updateCartUI();
        setTimeout(() => toggleCart(), 500);
    }
}

function checkout() {
    if(cart.length === 0) return alert("El carrito está vacío");
    let message = "Hola! Te envío mi pedido desde la web de *Geminis SurTienda*:%0A%0A";
    let totalAcumulado = 0;
    cart.forEach(item => {
        const precio = parseFloat(item.price.toString().replace(/[$.]/g, '').replace(',', '.')) || 0;
        message += `• ${item.tituloConVariante} - $${precio.toLocaleString('es-AR')}%0A`;
        totalAcumulado += precio;
    });
    message += `%0A*Total: $${totalAcumulado.toLocaleString('es-AR')}*%0A%0ACoordinamos el pago?`;
    window.open(`https://wa.me/${MI_WHATSAPP}?text=${message}`, '_blank');
}

function filterProducts(category) {
    if (category === 'todo') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category && p.category.toLowerCase().trim() === category.toLowerCase().trim());
        renderProducts(filtered);
    }
}

function searchProducts() {
    const searchInput = document.getElementById('product-search');
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = products.filter(product => {
        const title = (product.title || "").toLowerCase();
        const category = (product.category || "").toLowerCase();
        const desc = (product.descripcion || "").toLowerCase();
        return title.includes(searchTerm) || category.includes(searchTerm) || desc.includes(searchTerm);
    });
    renderProducts(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    const contactForm = document.getElementById('whatsapp-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = document.getElementById('nombre-contacto').value;
            const asunto = document.getElementById('asunto-contacto').value;
            const mensaje = document.getElementById('mensaje-contacto').value;
            const textoWhatsApp = `Hola! Vengo de la web de *Geminis SurTienda*. Mi nombre es *${nombre}*.%0A%0A*Consulta:* ${asunto}%0A*Mensaje:* ${mensaje}`;
            window.open(`https://wa.me/${MI_WHATSAPP}?text=${textoWhatsApp}`, '_blank');
        });
    }

    const btnTheme = document.getElementById('dark-mode-toggle');
    const themeIcon = document.getElementById('theme-icon');
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if(themeIcon) themeIcon.innerText = '☀️';
    }
    if(btnTheme) {
        btnTheme.addEventListener('click', () => {
            let isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                if(themeIcon) themeIcon.innerText = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                if(themeIcon) themeIcon.innerText = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    if (!sessionStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            const modal = document.getElementById('welcome-modal');
            if(modal) modal.classList.remove('hidden');
        }, 1500);
    }
});

function closeWelcome() {
    const modal = document.getElementById('welcome-modal');
    if(modal) modal.classList.add('hidden');
    sessionStorage.setItem('welcomeShown', 'true');
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onscroll = function() {
    const btn = document.getElementById("btn-scroll-top");
    if (btn) {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            btn.classList.remove("hidden");
            btn.style.display = "flex";
        } else {
            btn.classList.add("hidden");
        }
    }
};