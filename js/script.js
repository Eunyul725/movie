// ====== 전역 상태 객체로 통합 관리 ======
const state = {
  lastChoices: [],
  allChoices: [],
  fullData: {},
  balanceInfoMap: new Map(),
  balanceSwiper: null
};

// ====== 초기 실행 ======
document.addEventListener('DOMContentLoaded', () => {
  fetch('./data/data.json')
    .then(res => res.json())
    .then(data => {
      state.fullData = data;
      state.allChoices = data.balance_choices;
      state.balanceInfoMap = new Map(data.balance_info.map(item => [item.name.trim(), item]));

      renderBanner(data.banner);
      initMoodSection(data);
      renderBalanceChoices();
      setupChoiceClickHandler();

      renderMovieList('.hot_list', data.hot);
      renderMovieList('.genre_list', data.genre, true);
      renderMovieList('.romance .movie_list', data.romance);
      renderMovieList('.ani_list', data.ani);
      renderMovieList('.action_list', data.action);
      renderMovieList('.new_list', data.new);
    })
    .catch(err => console.error('data load error:', err));
});


// ====== 배너 ======
function renderBanner(banners) {
  const wrapper = document.querySelector('#banner-wrapper');
  wrapper.innerHTML = '';

  banners.forEach(item => {
    const slide = document.createElement('a');
    slide.href = '#';
    slide.classList.add('swiper-slide');
    slide.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <p class="text_content">${item.text}</p>
    `;
    wrapper.appendChild(slide);
  });

  new Swiper('.banner_swiper', {
    autoplay: { delay: 2000 },
    loop: true,
    pagination: { el: '.swiper-pagination' },
    breakpoints: {
      0: { slidesPerView: 1 },
      1200: { slidesPerView: 1.2, spaceBetween: 30, autoplay: { delay: 4000 } }
    }
  });
}


// ====== 오늘 기분 ======
function initMoodSection(data) {
  const moodButtons = document.querySelectorAll('.emoticon a');
  const moodTitle = document.querySelector('.mood_movies h2');
  const moodSection = document.querySelector('.mood_movies');

  const moodTextMap = {
    smile: '기분이 좋아요!',
    sad: '지친 하루 끝에, 위로가 필요한 당신에게',
    anger: '화날 땐 이것!',
    heart: '설렘주의! 심장이 콩닥콩닥',
    tired: '오늘 진짜 피곤했죠?'
  };

  moodButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      moodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mood = btn.dataset.mood;
      const movies = data[`${mood}_Movies`] || [];
      moodTitle.textContent = moodTextMap[mood] || '오늘의 추천';

      renderMoodMovies(movies);
      moodSection.classList.add('show');
    });
  });
}

function renderMoodMovies(movies) {
  const swiperWrapper = document.querySelector('.swiper-wrapper.suggested_movies');
  swiperWrapper.innerHTML = '';

  movies.forEach(movie => {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide');
    slide.innerHTML = `<a href="#"><img src="${movie.img}" alt="${movie.name}"></a>`;
    swiperWrapper.appendChild(slide);
  });

  new Swiper('.mood_swiper', {
    slidesPerView: 'auto',
    spaceBetween: 16,
    freeMode: true,
    grabCursor: true
  });
}


// ====== 밸런스 게임 ======
function renderBalanceChoices() {
  const container = document.querySelector('.choice_wrap');
  if (!container || state.allChoices.length < 2) return;
  container.innerHTML = '';

  let selected = [];
  for (let i = 0; i < 10; i++) {
    const shuffled = [...state.allChoices].sort(() => Math.random() - 0.5);
    selected = shuffled.slice(0, 2);
    if (!state.lastChoices.every(prev => selected.some(sel => sel.name === prev.name))) break;
  }
  state.lastChoices = selected;

  selected.forEach((item, index) => {
    const choice = document.createElement('div');
    choice.classList.add('choices');
    choice.innerHTML = `
      <img src="${item.icon}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
    `;
    container.appendChild(choice);

    if (index === 0) {
      const vs = document.createElement('span');
      vs.textContent = 'VS';
      vs.classList.add('vs');
      container.appendChild(vs);
    }
  });
}

function setupChoiceClickHandler() {
  const container = document.querySelector('.choice_wrap');
  const movieWrap = document.querySelector('.balance_movie');

  container.addEventListener('click', e => {
    const clicked = e.target.closest('.choices');
    if (!clicked) return;

    container.querySelectorAll('.choices').forEach(c => c.classList.remove('active'));
    clicked.classList.add('active');

    const genre = clicked.querySelector('h3')?.textContent.trim();
    const info = state.balanceInfoMap.get(genre);
    if (!info) return;

    const movies = state.fullData[info.key];
    const title = movieWrap.querySelector('h2');
    const subtitle = movieWrap.querySelector('h3');
    const movieList = movieWrap.querySelector('.suggested_movies');

    title.textContent = info.title;
    subtitle.textContent = info.subtitle;
    movieList.innerHTML = '';

    movies.forEach(movie => {
      const slide = document.createElement('div');
      slide.classList.add('swiper-slide');
      slide.innerHTML = `
        <div class="movie_card">
          <a href="#">
            <img src="${movie.img}" alt="${movie.name}">
            <p>${movie.text}</p>
          </a>
          <span class="btn_like"></span>
        </div>
      `;

      slide.querySelector('.btn_like').addEventListener('click', e => {
        e.stopPropagation();
        e.currentTarget.classList.toggle('active');
      });

      movieList.appendChild(slide);
    });

    if (state.balanceSwiper) state.balanceSwiper.destroy(true, true);
    state.balanceSwiper = new Swiper('.balance_swiper', {
      slidesPerView: 'auto',
      spaceBetween: 16,
      freeMode: true,
      grabCursor: true
    });

    movieWrap.classList.add('show');
  });
}

const retryBtn = document.querySelector('.btns_wrap span');
if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    document.querySelector('.balance_movie').classList.remove('show');
    document.querySelector('#balance_game .choice_wrap').style.display = 'flex';
    renderBalanceChoices();
  });
}


// ====== 영화 리스트 ======
function renderMovieList(selector, items, showLabel = false) {
  const container = document.querySelector(selector);
  if (!container || !items) return;

  container.innerHTML = '';

  items.forEach(item => {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide');

    const movieItem = document.createElement('div');
    movieItem.classList.add('movie_item');

    if (showLabel && item.name) {
      const span = document.createElement('span');
      span.textContent = item.name;
      movieItem.appendChild(span);
    }

    const a = document.createElement('a');
    a.href = '#';

    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.name;

    a.appendChild(img);
    movieItem.appendChild(a);
    slide.appendChild(movieItem);
    container.appendChild(slide);
  });

  const swiperParent = container.closest('.swiper');
  if (swiperParent) {
    new Swiper(swiperParent, {
      slidesPerView: 'auto',
      spaceBetween: 16,
      freeMode: true,
      grabCursor: true
    });
  }
}