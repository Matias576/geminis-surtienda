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
                    <p class="product-description">${product.descripcion || ''}</p>
                    ${variantesHTML}
                    <div class="product-buttons">
                        <button class="btn-add" onclick="addToCart('${product.id}', event)">Agregar al Carrito</button>
                        <button class="btn-query" onclick="queryWhatsApp('${product.title}')">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="16" alt="WA"> Consultar
                        </button>
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
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.marginBottom = "10px";
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
        cart = [];
        updateCartUI();
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

function queryWhatsApp(productTitle) {
    const mensaje = `Hola *Geminis SurTienda*! Me gustaría consultar por este producto: *${productTitle}*`;
    window.open(`https://wa.me/${MI_WHATSAPP}?text=${encodeURIComponent(mensaje)}`, '_blank');
}