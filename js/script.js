document.addEventListener('DOMContentLoaded', () => {
    // 响应式导航菜单
    const createMobileMenu = () => {
        const navbar = document.querySelector('.navbar');
        const navLinks = document.querySelector('.nav-links');

        // 创建汉堡菜单按钮
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger';
        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        navbar.querySelector('.nav-container').appendChild(hamburger);

        // 添加点击事件
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    };

    // 滚动动画
    const animateOnScroll = () => {
        const elements = document.querySelectorAll(
            '.feature, .lesson, .step, .price-package, .blog-post, .testimonial'
        );

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1
            }
        );

        elements.forEach(element => {
            observer.observe(element);
        });
    };

    // 平滑滚动
    const smoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // 表单验证
    const setupFormValidation = () => {
        const newsletterForm = document.querySelector('.newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const emailInput = newsletterForm.querySelector('input[type="email"]');
                if (emailInput.value.trim() === '') {
                    alert('请输入您的邮箱地址');
                    return;
                }
                // 这里可以添加实际的表单提交逻辑
                alert('感谢您的订阅！');
                newsletterForm.reset();
            });
        }
    };

    // 初始化所有功能
    createMobileMenu();
    animateOnScroll();
    smoothScroll();
    setupFormValidation();
});