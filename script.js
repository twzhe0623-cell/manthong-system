// 1. 云端同步配置
const CLOUD_CONFIG = {
    TOKEN: localStorage.getItem('MY_GH_TOKEN') || '', 
    OWNER: 'twzhe0623-cell',
    REPO: 'manthong-system',
    FILE: 'data.json'
};

const CONFIG = {
    STORAGE_KEYS: {
        CARS: 'car_dealership_inventory_v2',
        RECYCLE: 'car_dealership_recycle_bin_v2',
        ADMIN_SESSION: 'admin_session_data'
    },
    ADMIN: { USER: 'admin', PASS: '7887', DURATION: 2 * 60 * 60 * 1000 }
};

const dataManager = {
    // 【云端下载】
    async fetchCloudData() {
        const url = `https://api.github.com/repos/${CLOUD_CONFIG.OWNER}/${CLOUD_CONFIG.REPO}/contents/${CLOUD_CONFIG.FILE}`;
        try {
            const resp = await fetch(url, {
                headers: { 'Authorization': `token ${CLOUD_CONFIG.TOKEN}` }
            });
            if (!resp.ok) return;
            const data = await resp.json();
            
            // 解码 GitHub 的 Base64 文字内容
            const cars = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            localStorage.setItem(CONFIG.STORAGE_KEYS.CARS, JSON.stringify(cars));
            console.log("✅ Cloud data loaded!");

            // ⭐ 自动识别当前网页文件名并过滤分行
            const path = window.location.pathname;
            let branch = 'all';
            if (path.includes('manthong')) branch = 'manthong';
            else if (path.includes('everforward')) branch = 'everforward';
            else if (path.includes('tscar')) branch = 'tscar';

            // 重新渲染页面列表
            if (document.getElementById('inventory-list')) {
                this.renderInventory('inventory-list', branch);
            }
            if (document.getElementById('admin-inventory-list')) {
                this.renderInventory('admin-inventory-list', 'all');
            }
        } catch (e) { 
            console.error("Cloud fetch failed:", e); 
        }
    },

    // 【云端上传】
    async pushToCloud(cars) {
        const url = `https://api.github.com/repos/${CLOUD_CONFIG.OWNER}/${CLOUD_CONFIG.REPO}/contents/${CLOUD_CONFIG.FILE}`;
        try {
            const getFile = await fetch(url, { headers: { 'Authorization': `token ${CLOUD_CONFIG.TOKEN}` } });
            let sha = "";
            if (getFile.ok) {
                const fileData = await getFile.json();
                sha = fileData.sha;
            }

            const content = btoa(unescape(encodeURIComponent(JSON.stringify(cars, null, 2))));
            const body = {
                message: `Stock Update: ${new Date().toLocaleString()}`,
                content: content,
                sha: sha
            };

            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Authorization': `token ${CLOUD_CONFIG.TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) { console.log("☁️ Synced to GitHub!"); }
        } catch (e) { console.error("Push failed:", e); }
    },

    getCars() { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CARS)) || []; },
    getDeletedCars() { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECYCLE)) || []; },
    
    saveCars(cars) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CARS, JSON.stringify(cars));
        this.pushToCloud(cars); 
    },

    moveToRecycle(index) {
        let cars = this.getCars();
        let deletedCars = this.getDeletedCars();
        const [removedCar] = cars.splice(index, 1);
        removedCar.deletedAt = new Date().toLocaleString();
        deletedCars.unshift(removedCar);
        this.saveCars(cars);
        localStorage.setItem(CONFIG.STORAGE_KEYS.RECYCLE, JSON.stringify(deletedCars));
    },

    restoreCar(index) {
        let cars = this.getCars();
        let deletedCars = this.getDeletedCars();
        const [restoredCar] = deletedCars.splice(index, 1);
        delete restoredCar.deletedAt;
        cars.push(restoredCar);
        this.saveCars(cars);
        localStorage.setItem(CONFIG.STORAGE_KEYS.RECYCLE, JSON.stringify(deletedCars));
    },

    getStatusColor(status) {
        const colors = { 'ready': 'success', 'preparing': 'warning', 'booked': 'danger' };
        return colors[status] || 'secondary';
    },

    isAdmin() {
        const session = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION));
        return session && session.isLoggedIn && Date.now() < session.expiryTime;
    },

    requireAdmin() { if (!this.isAdmin()) window.location.href = 'login.html'; },

    renderInventory(containerId, branchFilter = 'all', searchQuery = '', statusFilter = 'all') {
        const container = document.getElementById(containerId);
        if (!container) return;
        let cars = this.getCars();
        const isManageMode = containerId === 'admin-inventory-list';

        if (branchFilter !== 'all') cars = cars.filter(c => c.branch === branchFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            cars = cars.filter(c => c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q) || (c.plate && c.plate.toLowerCase().includes(q)));
        }
        if (statusFilter !== 'all') cars = cars.filter(c => c.status === statusFilter);

        if (cars.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5 text-muted">No Vehicles Found.</div>`;
            return;
        }

        container.innerHTML = cars.map((car, index) => {
            const otr = parseFloat(car.price || 0) + parseFloat(car.proc_fee || 0);
            const statusLabel = { 'ready': 'READY STOCK', 'preparing': 'PREPARING...', 'booked': 'BOOKED' }[car.status] || car.status.toUpperCase();

            return `
            <div class="col-md-6 col-xl-4 mb-4">
                <div class="glass-card h-100 car-card position-relative overflow-hidden shadow-sm">
                    <span class="badge position-absolute top-0 start-0 m-3 bg-${this.getStatusColor(car.status)}">${statusLabel}</span>
                    <span class="badge position-absolute top-0 end-0 m-3 bg-dark opacity-75">${car.year || '-'}</span>
                    <img src="${car.image || 'https://via.placeholder.com/400x250'}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body p-3">
                        <h5 class="fw-bold mb-0">${car.brand} ${car.model}</h5>
                        <p class="text-primary small fw-bold mb-2">${car.spec || '-'}</p>
                        <div class="row g-2 mb-2 text-center">
                            <div class="col-6"><div class="bg-light rounded p-1 border small">Color: <b>${car.colour || '-'}</b></div></div>
                            <div class="col-6"><div class="bg-light rounded p-1 border small">Plate: <b>${car.plate || '-'}</b></div></div>
                        </div>
                        <div class="bg-light p-2 rounded mb-3 small">
                            <div class="d-flex justify-content-between text-danger fw-bold"><span>Price OTR:</span><span>RM ${otr.toLocaleString()}</span></div>
                        </div>
                        <div class="d-grid gap-2">
                            <a href="calculator.html?price=${otr}" class="btn btn-primary btn-sm rounded-pill">Calculator</a>
                            ${isManageMode ? `
                                <div class="btn-group w-100 mt-1">
                                    <button onclick="editCar(${index})" class="btn btn-outline-dark btn-sm">Edit</button>
                                    <button onclick="deleteCar(${index})" class="btn btn-outline-danger btn-sm">Delete</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
};

// 页面加载启动
dataManager.fetchCloudData();
