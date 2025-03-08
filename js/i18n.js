// 语言配置
const translations = {
    'zh': {
        'nav': {
            'about': '关于我们',
            'courses': '音乐课程',
            'news': '新闻',
            'prod': '商品',
            'gallery': '作品长廊',
            'campus': '校区',
            'contact': '联系我们',
            'trial': '预约试课',
            'teachers': '师资力量',
        }
    },
    'en': {
        'nav': {
            'about': 'About Us',
            'courses': 'Courses',
            'news': 'News',
            'prod': 'Products',
            'gallery': 'Gallery',
            'campus': 'Campus',
            'contact': 'Contact',
            'trial': 'Book Trial',
            'teachers': 'Teachers',
        }
    }
};

// 获取当前语言
function getCurrentLang() {
    return localStorage.getItem('lang') || 'zh';
}

// 切换语言
function toggleLanguage() {
    const currentLang = getCurrentLang();
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', newLang);
    updatePageLanguage();
}

// 更新页面语言
function updatePageLanguage() {
    const currentLang = getCurrentLang();
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let translation = translations[currentLang];
        keys.forEach(k => {
            translation = translation[k];
        });
        if (translation) {
            element.textContent = translation;
        }
    });

    // 更新语言切换按钮文本
    const langBtn = document.querySelector('.lang-switch');
    if (langBtn) {
        langBtn.textContent = currentLang === 'zh' ? 'EN' : '中';
    }
}

// 初始化语言
document.addEventListener('DOMContentLoaded', () => {
    updatePageLanguage();
});