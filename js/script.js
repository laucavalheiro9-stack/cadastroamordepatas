/* ============================================================
   AMOR DE PATAS - JAVASCRIPT PRINCIPAL
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeSmoothScroll();
});

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const CONFIG = {
    API_ENDPOINT: '/api/leads',
    MIN_NAME_LENGTH: 2,
    MIN_CITY_LENGTH: 2,
    MAX_FIELD_LENGTH: 100,
    PHONE_MIN_LENGTH: 10,
    PHONE_MAX_LENGTH: 15
};

// ============================================================
// FORMULÁRIO
// ============================================================

function initializeForm() {
    const form = document.getElementById('leadForm');
    
    if (!form) return;
    
    // Validação em tempo real
    form.addEventListener('input', function(e) {
        validateFieldOnInput(e.target);
    });
    
    // Envio do formulário
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Valida um campo enquanto o usuário digita
 */
function validateFieldOnInput(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    
    // Remove mensagem de erro anterior
    removeFieldError(field);
    
    // Validações específicas
    switch(fieldName) {
        case 'nome':
            if (value.length < CONFIG.MIN_NAME_LENGTH) {
                showFieldError(field, 'Mínimo 2 caracteres');
            }
            break;
            
        case 'email':
            if (!isValidEmail(value)) {
                showFieldError(field, 'E-mail inválido');
            }
            break;
            
        case 'whatsapp':
            if (!isValidPhoneNumber(value)) {
                showFieldError(field, 'WhatsApp inválido (mín. 10 dígitos)');
            }
            break;
            
        case 'cidade':
            if (value.length < CONFIG.MIN_CITY_LENGTH) {
                showFieldError(field, 'Mínimo 2 caracteres');
            }
            break;
            
        case 'nome_pet':
            if (value.length < 1) {
                showFieldError(field, 'Campo obrigatório');
            }
            break;
    }
}

/**
 * Envia o formulário
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('#submitBtn');
    const messageDiv = document.getElementById('formMessage');
    
    // Limpa mensagens anteriores
    clearMessage(messageDiv);
    
    // Validação completa
    if (!validateAllFields(form)) {
        showError(messageDiv, 'Por favor, preencha todos os campos obrigatórios corretamente.');
        return;
    }
    
    // Verifica consentimento
    const consentimentoCheckbox = form.querySelector('input[name="consentimento_campanha"]');
    if (!consentimentoCheckbox.checked) {
        showError(messageDiv, 'Você precisa aceitar o consentimento obrigatório.');
        consentimentoCheckbox.focus();
        return;
    }
    
    try {
        // Desabilita o botão e mostra loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Enviando cadastro...';
        showLoading(messageDiv, 'Enviando cadastro...');
        
        // Coleta dados do formulário
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Converte checkboxes para booleano
        data.consentimento_campanha = consentimentoCheckbox.checked;
        data.consentimento_marketing = form.querySelector('input[name="consentimento_marketing"]').checked;
        
        // Sanitiza dados no frontend
        for (let key in data) {
            if (typeof data[key] === 'string') {
                data[key] = sanitizeString(data[key]);
            }
        }
        
        // Envio via fetch
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao enviar dados');
        }
        
        // Sucesso!
        showSuccess(messageDiv, 
            '✅ Cadastro realizado com sucesso! 🐾❤️\n\n' +
            'Seu pet já está cadastrado na campanha da Amor de Patas.\n\n' +
            'Em breve entraremos em contato pelo WhatsApp ou e-mail informado com mais informações.'
        );
        
        // Limpa o formulário
        form.reset();
        
        // Scroll até a mensagem
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        showError(messageDiv, 
            'Não conseguimos realizar seu cadastro agora.\n\n' + 
            'Por favor, tente novamente em alguns instantes.'
        );
    } finally {
        // Reabilita o botão
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'QUERO PARTICIPAR 🐾';
    }
}

/**
 * Valida todos os campos do formulário
 */
function validateAllFields(form) {
    let isValid = true;
    
    // Campos obrigatórios
    const requiredFields = [
        'nome', 'whatsapp', 'email', 'cidade', 'nome_pet', 'especie', 'origem'
    ];
    
    requiredFields.forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        const value = field.value.trim();
        
        // Validação específica por campo
        if (fieldName === 'nome' && value.length < CONFIG.MIN_NAME_LENGTH) {
            showFieldError(field, 'Nome inválido');
            isValid = false;
        } else if (fieldName === 'email' && !isValidEmail(value)) {
            showFieldError(field, 'E-mail inválido');
            isValid = false;
        } else if (fieldName === 'whatsapp' && !isValidPhoneNumber(value)) {
            showFieldError(field, 'WhatsApp inválido');
            isValid = false;
        } else if (fieldName === 'cidade' && value.length < CONFIG.MIN_CITY_LENGTH) {
            showFieldError(field, 'Cidade inválida');
            isValid = false;
        } else if (fieldName === 'nome_pet' && value.length < 1) {
            showFieldError(field, 'Nome do pet obrigatório');
            isValid = false;
        } else if ((fieldName === 'especie' || fieldName === 'origem') && !value) {
            showFieldError(field, 'Selecione uma opção');
            isValid = false;
        } else {
            removeFieldError(field);
        }
    });
    
    return isValid;
}

/**
 * Mostra erro em um campo
 */
function showFieldError(field, message) {
    removeFieldError(field);
    
    const errorDiv = document.createElement('small');
    errorDiv.className = 'form-text text-danger field-error';
    errorDiv.textContent = '❌ ' + message;
    
    field.parentElement.appendChild(errorDiv);
    field.classList.add('is-invalid');
    field.style.borderColor = '#dc3545';
}

/**
 * Remove erro de um campo
 */
function removeFieldError(field) {
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.classList.remove('is-invalid');
    field.style.borderColor = '';
}

/**
 * Mostra mensagem de erro
 */
function showError(messageDiv, message) {
    messageDiv.className = 'alert alert-danger alert error';
    messageDiv.innerHTML = '❌ ' + message.replace(/\n\n/g, '<br><br>');
    messageDiv.style.display = 'block';
}

/**
 * Mostra mensagem de sucesso
 */
function showSuccess(messageDiv, message) {
    messageDiv.className = 'alert alert-success alert success';
    messageDiv.innerHTML = message.replace(/\n\n/g, '<br><br>');
    messageDiv.style.display = 'block';
}

/**
 * Mostra mensagem de loading
 */
function showLoading(messageDiv, message) {
    messageDiv.className = 'alert alert-info alert loading';
    messageDiv.innerHTML = '⏳ ' + message;
    messageDiv.style.display = 'block';
}

/**
 * Limpa mensagem
 */
function clearMessage(messageDiv) {
    messageDiv.innerHTML = '';
    messageDiv.style.display = 'none';
}

// ============================================================
// VALIDAÇÕES
// ============================================================

/**
 * Valida e-mail
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 100;
}

/**
 * Valida telefone/WhatsApp
 */
function isValidPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= CONFIG.PHONE_MIN_LENGTH && 
           cleaned.length <= CONFIG.PHONE_MAX_LENGTH;
}

/**
 * Sanitiza string (remove caracteres perigosos)
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .trim()
        .slice(0, CONFIG.MAX_FIELD_LENGTH)
        .replace(/[<>\"\']/g, ''); // Remove caracteres perigosos
}

// ============================================================
// SCROLL SUAVE
// ============================================================

function initializeSmoothScroll() {
    // Encontra todos os links de âncora internos
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Ignora modal links
            if (this.hasAttribute('data-bs-toggle')) return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Log seguro (não expõe informações sensíveis)
 */
function safeLog(message) {
    console.log('[Amor de Patas] ' + message);
}

/**
 * Formata telefone enquanto digita
 */
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
        value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    
    input.value = value;
}

/**
 * Inicializa formatação de telefone
 */
document.addEventListener('DOMContentLoaded', function() {
    const whatsappField = document.getElementById('whatsapp');
    if (whatsappField) {
        whatsappField.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
    }
});

// ============================================================
// VERIFICAÇÃO DO NAVEGADOR
// ============================================================

// Verifica suporte a fetch
if (!window.fetch) {
    console.warn('Seu navegador não suporta Fetch API. Por favor, use um navegador mais recente.');
}

// Avisa sobre erros no console
window.addEventListener('error', function(event) {
    console.error('[Erro]', event.message);
    // Não expõe erro ao servidor
});

// ============================================================
// LAZY LOADING DE IMAGENS (se houver)
// ============================================================

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ============================================================
// FEACEBACK DE FOCO PARA ACESSIBILIDADE
// ============================================================

document.addEventListener('focusin', function(event) {
    if (event.target.matches('button, a, input, select, textarea')) {
        event.target.style.outline = '2px solid #fdba43';
        event.target.style.outlineOffset = '2px';
    }
});

document.addEventListener('focusout', function(event) {
    if (event.target.matches('button, a, input, select, textarea')) {
        event.target.style.outline = '';
        event.target.style.outlineOffset = '';
    }
});

// ============================================================
// LOG INICIAL
// ============================================================

safeLog('Página carregada - Campanha de Vacinação');
