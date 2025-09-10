// HTML 문서 로딩이 끝나면 안의 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', function() {
    
    // 로그인 폼(form) 요소를 찾습니다.
    const loginForm = document.getElementById('login-form');

    // 폼에서 'submit' 이벤트 (로그인 버튼 클릭)가 발생했을 때 실행될 함수를 정의합니다.
    loginForm.addEventListener('submit', async function(event) {
        
        // 1. 폼의 기본 동작(페이지 새로고침)을 막습니다.
        event.preventDefault(); 

        // 2. 폼에 입력된 데이터를 가져옵니다.
        const formData = new FormData(loginForm);
        const loginData = Object.fromEntries(formData.entries());

        try {
            // 3. 백엔드의 로그인 API에 POST 요청을 보냅니다.
            const response = await fetch('http://localhost:8080/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            // 4. 로그인 성공 시
            if (response.ok) {
                // 응답 헤더에서 'Autorization' 토큰을 꺼냅니다.
                const token = response.headers.get('Authorization');
                
                if (token) {
                    // 5. 받아온 토큰을 브라우저의 localStorage라는 저장 공간에 저장합니다.
                    // (앞에 'Bearer ' 부분은 떼고 순수한 토큰 값만 저장)
                    localStorage.setItem('authToken', token.replace('Bearer ', ''));
                    alert('로그인에 성공했습니다!');
                    
                    // 6. 관리자 대시보드(index.html) 페이지로 이동합니다.
                    window.location.href = 'index.html';
                } else {
                    throw new Error('로그인에 성공했지만 토큰을 받지 못했습니다.');
                }
            } else {
                // 7. 로그인 실패 시 (아이디/비밀번호 불일치 등)
                const errorText = await response.text();
                throw new Error(errorText || '로그인에 실패했습니다.');
            }

        } catch (error) {
            console.error('로그인 중 에러 발생:', error);
            alert('로그인 실패: ' + error.message);
        }
    });
});