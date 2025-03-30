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

    // 预约按钮点击事件处理
    const setupBookingButtons = () => {
        // 创建toast提示元素
        const createToast = () => {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.position = 'fixed';
            toast.style.top = '50px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            toast.style.color = 'white';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '4px';
            toast.style.zIndex = '1000';
            toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            toast.style.transition = 'opacity 0.3s ease-in-out';
            toast.style.opacity = '0';
            document.body.appendChild(toast);
            return toast;
        };

        // 显示toast提示
        const showToast = (message) => {
            const toast = createToast();
            toast.textContent = message;
            setTimeout(() => {
                toast.style.opacity = '1';
            }, 10);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        };

        // 为所有包含"预约"或"预订"字样的元素添加点击事件
        const bookingElements = document.querySelectorAll('a, button, .fab.fa-whatsapp');
        bookingElements.forEach(element => {
            const text = element.textContent.trim();
            if (text.includes('预约') || text.includes('预订') || text.includes('了解') || element.classList.contains('fab') && element.classList.contains('fa-whatsapp')) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    showToast('请拨打电话：+65 9765 0902');
                });
            }
        });
    };

    // 初始化所有功能
    createMobileMenu();
    animateOnScroll();
    smoothScroll();
    setupFormValidation();
    setupBookingButtons();
});