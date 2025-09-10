document.addEventListener('DOMContentLoaded', function() {
    console.log('관리자 대시보드 스크립트가 시작되었습니다.');

    // 1. 로그인 시 저장된 토큰을 가져옵니다.
    const authToken = localStorage.getItem('authToken');

    // 2. 토큰이 없으면 로그인 페이지로 쫓아냅니다 (보안).
    if (!authToken) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return; // 여기서 스크립트 실행을 멈춥니다.
    }

    // 3. 모든 API 요청에 사용할 공통 헤더를 미리 만들어 둡니다.
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
    };

    // --- [ 1. 변수 선언: HTML 요소 찾아오기 ] ---
    const categoryContainer = document.getElementById('category-list-container');
    const menuListContainer = document.getElementById('menu-list');
    const userListTbody = document.getElementById('user-list-tbody');
    
    // 메뉴 추가 모달
    const menuModal = document.getElementById('add-menu-modal');
    const addNewMenuBtn = document.getElementById('add-new-menu-btn');
    const menuModalCloseBtn = menuModal.querySelector('.close-button');
    const addMenuForm = document.getElementById('add-menu-form');
    const menuCategorySelect = document.getElementById('menu-category');

    // 메뉴 수정 모달
    const editMenuModal = document.getElementById('edit-menu-modal');
    const editMenuForm = document.getElementById('edit-menu-form');
    const editMenuModalCloseBtn = editMenuModal.querySelector('.close-button');

    // 유저 추가 모달
    const userModal = document.getElementById('add-user-modal');
    const addNewUserBtn = document.getElementById('add-new-user-btn');
    const userModalCloseBtn = userModal.querySelector('.close-button');
    const addUserForm = document.getElementById('add-user-form');

    let categoriesCache = []; // 카테고리 데이터를 재사용하기 위한 변수

    // --- [ 2. 함수 정의 ] ---

    // --- 모달 제어 함수 ---
    function openMenuModal() { populateCategorySelect(); menuModal.style.display = 'block'; }
    function closeMenuModal() { menuModal.style.display = 'none'; addMenuForm.reset(); }
    function openUserModal() { userModal.style.display = 'block'; }
    function closeUserModal() { userModal.style.display = 'none'; addUserForm.reset(); }
    function openEditMenuModal() { populateCategorySelectForEdit(); editMenuModal.style.display = 'block'; }
    function closeEditMenuModal() { editMenuModal.style.display = 'none'; editMenuForm.reset(); }

     async function fetchSalesByMenu() {
        const tbody = document.getElementById('sales-by-menu-tbody');
        tbody.innerHTML = '<tr><td colspan="3">로딩 중...</td></tr>';
        
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 29);
            const formatDate = (date) => date.toISOString().split('T')[0];

            const response = await fetch(`http://localhost:8080/api/sales/by-menu?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`, {
                headers: authHeaders
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '메뉴별 매출 로딩 실패');
            }
            const salesData = await response.json();
            renderSalesByMenuTable(salesData);
        } catch (error) {
            console.error('메뉴별 매출 로딩 중 오류 발생:', error);
            tbody.innerHTML = '<tr><td colspan="3">메뉴별 매출 데이터를 불러오는데 실패했습니다.</td></tr>';
        }
    }

    function renderSalesByMenuTable(salesData) {
        const tbody = document.getElementById('sales-by-menu-tbody');
        if (salesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">최근 30일간 판매된 메뉴가 없습니다.</td></tr>';
            return;
        }
        const rowsHtml = salesData.map(item => `
            <tr>
                <td>${item.menuName}</td>
                <td>${item.quantitySold.toLocaleString()}개</td>
                <td>${item.totalSales.toLocaleString()}원</td>
            </tr>
        `).join('');
        tbody.innerHTML = rowsHtml;
    }

    // --- 카테고리 & 메뉴 관련 함수 ---
    async function setupCategories() {
        try {
            // 카테고리 조회는 인증이 필요 없으므로 헤더 없이 요청
            const response = await fetch('http://localhost:8080/api/categories');
            if (!response.ok) throw new Error('카테고리 로딩 실패');
            categoriesCache = await response.json();
            const buttonsHTML = categoriesCache.map(cat => `<button class="category-button" data-category-id="${cat.id}">${cat.name}</button>`).join('');
            categoryContainer.innerHTML = buttonsHTML;
        } catch (error) { console.error(error); }
    }

    async function fetchMenuItems(categoryId) {
        menuListContainer.innerHTML = '<p>로딩 중...</p>';
        try {
            const response = await fetch(`http://localhost:8080/api/categories/${categoryId}/menu-items`);
            if (!response.ok) throw new Error('메뉴 로딩 실패');
            const menuItems = await response.json();
            renderMenuItems(menuItems);
        } catch (error) {
            console.error(error);
            menuListContainer.innerHTML = '<p>메뉴를 불러오는데 실패했습니다.</p>';
        }
    }

    function renderMenuItems(menuItems) {
        if (menuItems.length === 0) {
            menuListContainer.innerHTML = '<p>메뉴가 없습니다.</p>';
            return;
        }
        const menuHTML = menuItems.map(item => {
            const imageTag = item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="menu-image">` : '<div class="menu-image-placeholder"></div>';
            return `
                <div class="menu-card">
                    ${imageTag}
                    <div class="menu-info">
                        <h4>${item.name}</h4>
                        <p>${item.price.toLocaleString()}원</p>
                        <p class="menu-description">${item.description || ''}</p>
                    </div>
                    <div class="menu-status ${item.isSoldOut ? 'sold-out' : ''}">${item.isSoldOut ? '품절' : '판매중'}</div>
                    <div class="menu-actions">
                        <button class="action-button-edit" data-menu-id="${item.id}">수정</button>
                        <button class="action-button-delete" data-menu-id="${item.id}">삭제</button>
                    </div>
                </div>`;
        }).join('');
        menuListContainer.innerHTML = menuHTML;
    }
    
    function populateCategorySelect() {
        menuCategorySelect.innerHTML = categoriesCache.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
    
    function populateCategorySelectForEdit() {
        const editMenuCategorySelect = document.getElementById('edit-menu-category');
        editMenuCategorySelect.innerHTML = categoriesCache.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
    
    function fillEditMenuForm(menuItem) {
    console.log('받아온 메뉴 데이터:', menuItem); // 디버깅용
    
    document.getElementById('edit-menu-id').value = menuItem.id || '';
    document.getElementById('edit-menu-name').value = menuItem.name || '';
    document.getElementById('edit-menu-price').value = menuItem.price || '';
    document.getElementById('edit-menu-description').value = menuItem.description || '';
    document.getElementById('edit-menu-image-url').value = menuItem.imageUrl || '';
    
    // category 속성이 존재하고 null이 아닌지 확인
    if (menuItem.category && menuItem.category.id) {
        document.getElementById('edit-menu-category').value = menuItem.category.id;
    } else if (menuItem.categoryId) {
        // 혹시 백엔드에서 categoryId로 보내는 경우
        document.getElementById('edit-menu-category').value = menuItem.categoryId;
    } else {
        console.warn('카테고리 정보가 없습니다. 현재 선택된 카테고리를 사용합니다.');
        // 현재 활성화된 카테고리 버튼에서 카테고리 ID 가져오기
        const activeBtn = document.querySelector('.category-button.active');
        if (activeBtn && activeBtn.dataset.categoryId) {
            document.getElementById('edit-menu-category').value = activeBtn.dataset.categoryId;
            console.log('현재 활성 카테고리 ID로 설정:', activeBtn.dataset.categoryId);
        } else {
            // 그래도 없으면 첫 번째 카테고리를 기본값으로 설정
            const firstOption = document.getElementById('edit-menu-category').querySelector('option');
            if (firstOption) {
                document.getElementById('edit-menu-category').value = firstOption.value;
                console.log('첫 번째 카테고리로 설정:', firstOption.value);
            }
        }
    }
}

async function deleteUser(userId) {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || '사용자 삭제에 실패했습니다.');
        }
        alert('사용자가 성공적으로 삭제되었습니다.');
        fetchUsers(); // 사용자 목록 새로고침
    } catch (error) {
        alert('사용자 삭제 중 에러 발생: ' + error.message);
    }
}

    async function deleteMenu(menuId) {
        if (!confirm('정말로 이 메뉴를 삭제하시겠습니까?')) return;
        try {
            const response = await fetch(`http://localhost:8080/api/menu-items/${menuId}`, { method: 'DELETE', headers: authHeaders });
            if (!response.ok) throw new Error('메뉴 삭제 실패');
            alert('메뉴가 삭제되었습니다.');
            const activeBtn = document.querySelector('.category-button.active');
            if (activeBtn) fetchMenuItems(activeBtn.dataset.categoryId);
        } catch (error) { alert('메뉴 삭제 에러: ' + error.message); }
    }

    // --- 유저 관련 함수 ---
    async function fetchUsers() {
        try {
            const response = await fetch('http://localhost:8080/api/users', { headers: authHeaders });
            if (!response.ok) throw new Error(`서버 에러: ${response.status}`);
            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.error(error);
            userListTbody.innerHTML = '<tr><td colspan="4">유저 목록 로딩 실패.</td></tr>';
        }
    }

   function renderUsers(users) {
    const userRowsHTML = users.map(user => `
        <tr>
            <td>${user.userName}</td>
            <td>${user.name}</td>
            <td>${user.role}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-button-delete user-delete-btn" data-user-id="${user.id}">삭제</button>
            </td>
        </tr>
    `).join('');
    userListTbody.innerHTML = userRowsHTML || '<tr><td colspan="5">등록된 유저가 없습니다.</td></tr>';
}

    // --- 매출 관련 함수 ---
    async function setupSalesCharts() {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 29);
            const formatDate = (date) => date.toISOString().split('T')[0];
            
            const dailyResponse = await fetch(`http://localhost:8080/api/sales/daily?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`, { headers: authHeaders });
            if (!dailyResponse.ok) throw new Error('일별 매출 로딩 실패');
            const dailySalesData = await dailyResponse.json();

            const currentYear = new Date().getFullYear();
            const monthlyResponse = await fetch(`http://localhost:8080/api/sales/monthly?year=${currentYear}`, { headers: authHeaders });
            if (!monthlyResponse.ok) throw new Error('월별 매출 로딩 실패');
            const monthlySalesData = await monthlyResponse.json();

            new Chart(document.getElementById('daily-sales-chart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: dailySalesData.map(d => d.saleDate),
                    datasets: [{ label: '일별 매출 (원)', data: dailySalesData.map(d => d.dailySales), backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
                }
            });

            new Chart(document.getElementById('monthly-sales-chart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: monthlySalesData.map(d => d.saleMonth),
                    datasets: [{ label: `${currentYear}년 월별 매출 (원)`, data: monthlySalesData.map(d => d.monthlySales), borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: true }]
                }
            });
        } catch (error) {
            console.error('매출 차트 생성 중 오류 발생:', error);
            document.getElementById('sales-section').innerHTML += '<p>매출 데이터를 불러오는 데 실패했습니다.</p>';
        }
    }

    // --- [ 3. 이벤트 리스너 설정 (통합 관리) ] ---
    addNewMenuBtn.addEventListener('click', openMenuModal);
    menuModalCloseBtn.addEventListener('click', closeMenuModal);
    
    addNewUserBtn.addEventListener('click', openUserModal);
    userModalCloseBtn.addEventListener('click', closeUserModal);
    
    editMenuModalCloseBtn.addEventListener('click', closeEditMenuModal);

    window.addEventListener('click', (event) => {
        if (event.target == menuModal) closeMenuModal();
        if (event.target == userModal) closeUserModal();
        if (event.target == editMenuModal) closeEditMenuModal();
    });

    userListTbody.addEventListener('click', (event) => {
    if (event.target.matches('.user-delete-btn')) {
        const userId = event.target.dataset.userId;
        deleteUser(userId);
    }
});

    categoryContainer.addEventListener('click', (event) => {
        if(event.target.matches('.category-button')) {
            document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            fetchMenuItems(event.target.dataset.categoryId);
        }
    });

    menuListContainer.addEventListener('click', async (event) => {
    const target = event.target;
    const menuId = target.dataset.menuId;

    if (target.matches('.action-button-delete')) {
        deleteMenu(menuId);
    }
    if (target.matches('.action-button-edit')) {
        try {
            console.log('메뉴 정보 요청 시작:', menuId); // 디버깅용
            
            const response = await fetch(`http://localhost:8080/api/menu-items/${menuId}`, { 
                headers: authHeaders,
                method: 'GET' // 명시적으로 GET 메소드 지정
            });
            
            console.log('응답 상태:', response.status, response.ok); // 디버깅용
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('서버 응답 에러:', errorText);
                throw new Error(`메뉴 정보 로딩 실패: ${response.status} - ${errorText}`);
            }
            
            const menuItemData = await response.json();
            console.log('메뉴 데이터 로드 성공:', menuItemData); // 디버깅용
            
            openEditMenuModal();
            fillEditMenuForm(menuItemData);
            
        } catch (error) {
            console.error('메뉴 편집 에러 상세:', error);
            
            // 더 구체적인 에러 메시지 제공
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                alert('네트워크 연결을 확인해주세요.');
            } else if (error.message.includes('401')) {
                alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
            } else {
                alert('메뉴 정보를 불러오는 데 실패했습니다: ' + error.message);
            }
        }
    }
});

    addMenuForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addMenuForm);
        const newMenuData = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('http://localhost:8080/api/menu-items', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(newMenuData)
            });
            if (!response.ok) throw new Error('메뉴 추가 실패');
            alert('새 메뉴가 추가되었습니다!');
            closeMenuModal();
            const activeBtn = document.querySelector('.category-button.active');
            if (activeBtn) fetchMenuItems(activeBtn.dataset.categoryId);
        } catch (error) {
            alert('메뉴 추가 에러: ' + error.message);
        }
    });

    editMenuForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(editMenuForm);
        const menuId = formData.get('id');
        const updatedMenuData = Object.fromEntries(formData.entries());
        delete updatedMenuData.id;

        try {
            const response = await fetch(`http://localhost:8080/api/menu-items/${menuId}`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify(updatedMenuData)
            });
            if (!response.ok) throw new Error('메뉴 수정 실패');
            alert('메뉴가 수정되었습니다!');
            closeEditMenuModal();
            const activeBtn = document.querySelector('.category-button.active');
            if (activeBtn) fetchMenuItems(activeBtn.dataset.categoryId);
        } catch (error) {
            alert('메뉴 수정 에러: ' + error.message);
        }
    });

    addUserForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addUserForm);
        const newUserData = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('http://localhost:8080/api/users/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserData)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '직원 추가 실패');
            }
            alert('새 직원이 추가되었습니다!');
            closeUserModal();
            fetchUsers();
        } catch (error) {
            alert('직원 추가 에러: ' + error.message);
        }
    });

    // --- [ 4. 초기 실행 ] ---
    // 비동기 함수들을 순서대로 실행하기 위해 async 즉시 실행 함수로 감싸줍니다.
    (async () => {
        await setupCategories();
        // 페이지 로딩 시, 첫 번째 카테고리가 있다면 자동으로 클릭해 메뉴를 보여줍니다.
        const firstCategoryButton = document.querySelector('.category-button');
        if (firstCategoryButton) {
            firstCategoryButton.click();
        }
        fetchUsers(); 
        setupSalesCharts();
        fetchSalesByMenu();
    })();
});