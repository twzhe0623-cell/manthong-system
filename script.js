// ==========================================
// Manthong Core Logic v8.0 - Full Data Edition
// ==========================================

const INITIAL_CARS = [
    { 
        id: 1, brand: "Proton", model: "X70", year: "2020", spec: "Premium", 
        colour: "White", plate: "VBA 1234", price: 85000, processing_fee: 2500, 
        branch: "Manthong", status: "Ready", image: "https://via.placeholder.com/400x250" 
    }
];

document.addEventListener('DOMContentLoaded', () => {
    // 初始化数据
    if (!localStorage.getItem('cars')) {
        localStorage.setItem('cars', JSON.stringify(INITIAL_CARS));
    }

    const pageType = document.body.getAttribute('data-page');
    const branchType = document.body.getAttribute('data-branch');

    if (pageType === 'inventory-view') {
        renderUserInventory(branchType);
    } else if (pageType === 'admin-manage') {
        renderAdminInventory();
    }
});

// [展示层] 渲染给客户看的分行页面
function renderUserInventory(branch) {
    const cars = JSON.parse(localStorage.getItem('cars')) || [];
    const container = document.getElementById('car-list');
    const filtered = cars.filter(c => c.branch === branch);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><h4>No Stock Available.</h4></div>`;
        return;
    }

    container.innerHTML = filtered.map(car => `
        <div class="col-md-4">
            <div class="morph-card">
                <div class="position-relative mb-3">
                    <img src="${car.image}" class="img-fluid rounded" style="height:200px; width:100%; object-fit:cover;">
                    <div class="status-badge" style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); border:1px solid var(--gold); padding:2px 10px; font-size:0.7rem;">${car.status.toUpperCase()}</div>
                    <div style="position:absolute; bottom:10px; right:10px; background:#000; color:#fff; padding:2px 8px; font-size:0.8rem; border:1px solid #444;">${car.plate}</div>
                </div>
                <h4 class="mb-1">${car.brand} ${car.model}</h4>
                <p class="text-muted small">${car.year} | ${car.spec} | ${car.colour}</p>
                <div class="price-tag h3 fw-900 text-warning">RM ${parseFloat(car.price).toLocaleString()}</div>
                <div class="small text-muted mb-3">+ RM ${car.processing_fee} (Processing Fee)</div>
                <a href="calculator.html?price=${car.price}" class="btn-glow w-100 d-block text-center text-decoration-none">LOAN CALCULATOR</a>
            </div>
        </div>
    `).join('');
}

// [管理层] 渲染后台管理表格
function renderAdminInventory() {
    const cars = JSON.parse(localStorage.getItem('cars')) || [];
    const tbody = document.getElementById('inventory-table');
    
    tbody.innerHTML = cars.map(car => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td class="py-3">
                <strong>${car.brand} ${car.model}</strong><br>
                <small class="text-muted">${car.plate} | ${car.year}</small>
            </td>
            <td>${car.branch}</td>
            <td>
                <select onchange="updateStatus(${car.id}, this.value)" class="form-select form-select-sm bg-dark text-white border-secondary">
                    <option value="Ready" ${car.status === 'Ready' ? 'selected' : ''}>Ready</option>
                    <option value="Preparing" ${car.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="Pending" ${car.status === 'Pending' ? 'selected' : ''}>Pending (还没拿)</option>
                </select>
            </td>
            <td>
                <button onclick="deleteCar(${car.id})" class="btn btn-sm btn-outline-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

// [功能层] 核心操作函数
window.addNewCar = (event) => {
    event.preventDefault();
    const cars = JSON.parse(localStorage.getItem('cars')) || [];
    const newCar = {
        id: Date.now(),
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        year: document.getElementById('year').value,
        spec: document.getElementById('spec').value,
        colour: document.getElementById('colour').value,
        plate: document.getElementById('plate').value,
        price: parseInt(document.getElementById('price').value),
        processing_fee: parseInt(document.getElementById('processing_fee').value || 0),
        branch: document.getElementById('branch').value,
        status: document.getElementById('status').value,
        image: document.getElementById('image').value || 'https://via.placeholder.com/400x250'
    };
    cars.push(newCar);
    localStorage.setItem('cars', JSON.stringify(cars));
    alert('Vehicle Added Successfully!');
    location.reload();
};

window.updateStatus = (id, newStatus) => {
    let cars = JSON.parse(localStorage.getItem('cars'));
    cars = cars.map(c => c.id === id ? {...c, status: newStatus} : c);
    localStorage.setItem('cars', JSON.stringify(cars));
};

window.deleteCar = (id) => {
    if(confirm('Delete this car?')) {
        let cars = JSON.parse(localStorage.getItem('cars'));
        cars = cars.filter(c => c.id !== id);
        localStorage.setItem('cars', JSON.stringify(cars));
        renderAdminInventory();
    }
};

window.exportDatabase = () => {
    const data = localStorage.getItem('cars');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Manthong_Fleet_Backup.json`;
    a.click();
};
