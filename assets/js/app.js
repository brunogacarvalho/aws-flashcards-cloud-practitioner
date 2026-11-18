
const STORAGE_KEY = 'cloudStudyCLFC02';

const domains = {
    'cloud-concepts': {
        file: 'data/cloud-concepts.json',
        title: 'Conceitos da nuvem',
        description: 'Revise os principais fundamentos da computação em nuvem.',
        label: 'CONCEITOS DA NUVEM'
    },
    'security-compliance': {
        file: 'data/security-compliance.json',
        title: 'Segurança e conformidade',
        description: 'Estude segurança, identidade, acesso e conformidade na AWS.',
        label: 'SEGURANÇA E CONFORMIDADE'
    },
    'cloud-technology-services': {
        file: 'data/cloud-technology-services.json',
        title: 'Tecnologia e serviços',
        description: 'Conheça os principais serviços e recursos da plataforma AWS.',
        label: 'TECNOLOGIA E SERVIÇOS'
    },
    'billing-pricing-support': {
        file: 'data/billing-pricing-support.json',
        title: 'Cobrança, preços e suporte',
        description: 'Revise custos, modelos de cobrança e planos de suporte AWS.',
        label: 'COBRANÇA, PREÇOS E SUPORTE'
    }
};

const elements = {
    domainButtons: document.querySelectorAll('.domain-card'),
    domainTitle: document.querySelector('#domain-title'),
    domainDescription: document.querySelector('#domain-description'),
    overallLabel: document.querySelector('#overall-progress-label'),
    overallBar: document.querySelector('#overall-progress-bar'),
    overallStudied: document.querySelector('#overall-studied'),
    overallKnown: document.querySelector('#overall-known'),
    filter: document.querySelector('#card-filter'),
    shuffle: document.querySelector('#shuffle-button'),
    currentCard: document.querySelector('#current-card'),
    totalCards: document.querySelector('#total-cards'),
    cardLabel: document.querySelector('#card-label'),
    cardStatus: document.querySelector('#card-status-label'),
    cardQuestion: document.querySelector('#card-question'),
    cardAnswer: document.querySelector('#card-answer'),
    answerText: document.querySelector('#answer-text'),
    cardDomain: document.querySelector('#card-domain-label'),
    reveal: document.querySelector('#reveal-button'),
    difficult: document.querySelector('#difficult-button'),
    known: document.querySelector('#known-button'),
    previous: document.querySelector('#previous-button'),
    next: document.querySelector('#next-button'),
    resetDomain: document.querySelector('#reset-domain-button'),
    resetAll: document.querySelector('#reset-all-button')
};

let cardSets = {};
let currentDomain = 'cloud-concepts';
let currentIndex = 0;
let currentFilter = 'all';
let visibleCards = [];
let shuffledCards = null;

function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

let progress = loadProgress();

progress.cards ??= {};
progress.currentIndices ??= {};

function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 1,
            currentDomain,
            currentIndices: progress.currentIndices,
            cards: progress.cards
        }));
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

function getCardState(card) {
    return progress.cards[card.id] || {
        studied: false,
        status: 'new'
    };
}

function setCardState(card, status = null) {
    const previous = getCardState(card);

    progress.cards[card.id] = {
        studied: true,
        status: status || previous.status
    };

    saveProgress();
    updateProgress();
}

function getAllCards() {
    return Object.values(cardSets).flat();
}

function getFilteredCards() {
    const source = shuffledCards || cardSets[currentDomain] || [];

    return source.filter(card => {
        const state = getCardState(card);

        if (currentFilter === 'new') return !state.studied;
        if (currentFilter === 'difficult') return state.status === 'difficult';
        if (currentFilter === 'known') return state.status === 'known';

        return true;
    });
}

function updateProgress() {
    const cards = getAllCards();
    const total = cards.length;

    const studied = cards.filter(card => getCardState(card).studied).length;
    const known = cards.filter(card => getCardState(card).status === 'known').length;

    const percentage = total ? Math.round(studied / total * 100) : 0;

    elements.overallLabel.textContent = `${percentage}%`;
    elements.overallBar.style.width = `${percentage}%`;
    elements.overallStudied.textContent = `${studied} de ${total} cartões estudados`;
    elements.overallKnown.textContent = `${known} dominados`;

    Object.keys(domains).forEach(domain => {
        const domainCards = cardSets[domain] || [];
        const count = domainCards.filter(card => getCardState(card).studied).length;
        const percent = domainCards.length ? count / domainCards.length * 100 : 0;

        const countElement = document.querySelector(`[data-domain-count="${domain}"]`);
        const barElement = document.querySelector(`[data-domain-progress="${domain}"]`);

        if (countElement) {
            countElement.textContent = `${count} / ${domainCards.length} estudados`;
        }

        if (barElement) {
            barElement.style.width = `${percent}%`;
        }
    });
}

function updateCard() {
    visibleCards = getFilteredCards();

    if (currentIndex >= visibleCards.length) {
        currentIndex = Math.max(0, visibleCards.length - 1);
    }

    const card = visibleCards[currentIndex];

    elements.totalCards.textContent = visibleCards.length;
    elements.currentCard.textContent = visibleCards.length ? currentIndex + 1 : 0;

    elements.previous.disabled = !card || currentIndex === 0;
    elements.next.disabled = !card || currentIndex >= visibleCards.length - 1;

    elements.cardAnswer.hidden = true;
    elements.cardLabel.textContent = 'PERGUNTA';
    elements.reveal.disabled = !card;
    elements.reveal.textContent = 'Revelar resposta';

    if (!card) {
        const messages = {
            new: 'Você já estudou todos os cartões deste domínio.',
            difficult: 'Nenhum cartão marcado como difícil.',
            known: 'Nenhum cartão dominado por enquanto.',
            all: 'Não há cartões disponíveis neste domínio.'
        };

        elements.cardQuestion.textContent = messages[currentFilter];
        elements.answerText.textContent = '';
        elements.cardStatus.textContent = 'SEM CARTÕES';
        elements.cardStatus.className = '';
        elements.cardDomain.textContent = domains[currentDomain].label;
        elements.difficult.disabled = true;
        elements.known.disabled = true;
        return;
    }

    elements.difficult.disabled = false;
    elements.known.disabled = false;

    const state = getCardState(card);

    elements.cardQuestion.textContent = card.question;
    elements.answerText.textContent = card.answer;
    elements.cardDomain.textContent = domains[currentDomain].label;

    const labels = {
        new: 'NOVO',
        difficult: 'DIFÍCIL',
        known: 'DOMINADO'
    };

    elements.cardStatus.textContent = labels[state.status];
    elements.cardStatus.className = state.status;

    progress.currentIndices[currentDomain] = card.originalIndex;
    saveProgress();
}

function revealAnswer() {
    const card = visibleCards[currentIndex];
    if (!card) return;

    elements.cardAnswer.hidden = false;
    elements.cardLabel.textContent = 'RESPOSTA';
    elements.reveal.textContent = 'Resposta revelada';

    setCardState(card);
}

function changeStatus(status) {
    const card = visibleCards[currentIndex];
    if (!card) return;

    setCardState(card, status);

    if (currentFilter !== 'all') {
        updateCard();
        return;
    }

    currentIndex = Math.min(currentIndex + 1, visibleCards.length - 1);
    updateCard();
}

function selectDomain(domain) {
    if (!domains[domain]) return;

    currentDomain = domain;
    currentIndex = 0;
    currentFilter = 'all';
    shuffledCards = null;

    elements.filter.value = 'all';

    elements.domainButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.domain === domain);
    });

    elements.domainTitle.textContent = domains[domain].title;
    elements.domainDescription.textContent = domains[domain].description;

    const savedIndex = progress.currentIndices[domain];
    const index = cardSets[domain].findIndex(
        card => card.originalIndex === savedIndex
    );

    if (index >= 0) currentIndex = index;

    saveProgress();
    updateCard();
}

function shuffleCards() {
    shuffledCards = [...(cardSets[currentDomain] || [])];

    for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCards[i], shuffledCards[j]] =
            [shuffledCards[j], shuffledCards[i]];
    }

    currentIndex = 0;
    updateCard();
}

function resetDomain() {
    if (!confirm('Deseja reiniciar o progresso deste domínio?')) return;

    Object.keys(progress.cards).forEach(id => {
        if (id.startsWith(`${currentDomain}:`)) {
            delete progress.cards[id];
        }
    });

    progress.currentIndices[currentDomain] = 0;
    currentIndex = 0;
    currentFilter = 'all';
    shuffledCards = null;
    elements.filter.value = 'all';

    saveProgress();
    updateProgress();
    updateCard();
}

function resetAll() {
    if (!confirm('Deseja apagar todo o progresso dos quatro domínios?')) return;

    progress.cards = {};
    progress.currentIndices = {};
    currentIndex = 0;
    currentFilter = 'all';
    shuffledCards = null;
    elements.filter.value = 'all';

    saveProgress();
    updateProgress();
    updateCard();
}

async function initialize() {
    try {
        for (const [domain, config] of Object.entries(domains)) {
            const response = await fetch(config.file);

            if (!response.ok) {
                throw new Error(`Erro ao carregar ${config.file}`);
            }

            const data = await response.json();

            cardSets[domain] = data.map((card, index) => ({
                ...card,
                id: `${domain}:${index}`,
                originalIndex: index
            }));
        }

        if (domains[progress.currentDomain]) {
            currentDomain = progress.currentDomain;
        }

        elements.domainButtons.forEach(button => {
            button.addEventListener('click', () => {
                selectDomain(button.dataset.domain);
            });

            button.classList.toggle(
                'active',
                button.dataset.domain === currentDomain
            );
        });

        elements.filter.addEventListener('change', event => {
            currentFilter = event.target.value;
            currentIndex = 0;
            shuffledCards = null;
            updateCard();
        });

        elements.shuffle.addEventListener('click', shuffleCards);
        elements.reveal.addEventListener('click', revealAnswer);

        elements.difficult.addEventListener('click', () => {
            changeStatus('difficult');
        });

        elements.known.addEventListener('click', () => {
            changeStatus('known');
        });

        elements.previous.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCard();
            }
        });

        elements.next.addEventListener('click', () => {
            if (currentIndex < visibleCards.length - 1) {
                currentIndex++;
                updateCard();
            }
        });

        elements.resetDomain.addEventListener('click', resetDomain);
        elements.resetAll.addEventListener('click', resetAll);

        elements.domainTitle.textContent = domains[currentDomain].title;
        elements.domainDescription.textContent = domains[currentDomain].description;

        const savedIndex = progress.currentIndices[currentDomain];
        const index = cardSets[currentDomain].findIndex(
            card => card.originalIndex === savedIndex
        );

        if (index >= 0) currentIndex = index;

        updateProgress();
        updateCard();

    } catch (error) {
        console.error(error);
        elements.cardQuestion.textContent =
            'Erro ao carregar os cartões. Verifique os arquivos de dados.';
        elements.cardStatus.textContent = 'ERRO';
    }
}

initialize();
