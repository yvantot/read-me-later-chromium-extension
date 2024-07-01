const url_list = document.getElementById('url-list');
const add_read = document.getElementById('add');
const add_all = document.getElementById('add-tabs');
const add_buttons = document.getElementById('add-buttons');
const trash_read = document.getElementById('trash');
const input_url = document.getElementById('input-box');
const link_count = document.getElementById('link-count');
const undo_delete = document.getElementById('undo');

const CHROME_FAVICON_API = 'https://www.google.com/s2/favicons?domain=';
const GOOGLE_SEARCH = 'https://www.google.com/search?q=';
const storage = chrome.storage.local;
let itemList = [];
let deleted_links = [];
const faviconCache = {};

storage.get(null, (keys) => {
  const loading_container = document.createElement('div');
  if (Object.keys(keys).length === 0) {
    storage.set({ links: [] });
    return;
  }
  itemList = keys.links;
  link_count.textContent = itemList.length;
  Promise.all(
    itemList.map(async (element) => {
      const url_data = document.createElement('li');
      const haveFavicon = await fetchFavicon(element.tab_url);
      url_data.setAttribute('class', 'link');
      url_data.innerHTML = `<input class="checkbox" type="checkbox" />
              <img src="${haveFavicon ? CHROME_FAVICON_API + element.tab_url : '/assets/settings.svg'}" style="width: 16px" alt="" />
              <a href="${element.tab_url}" target="_blank">${element.title_url}</a>`;
      return url_data;
    })
  ).then((links) => {
    links.forEach((link) => url_list.appendChild(link));
    loading_container.remove();
  });
  loading_container.setAttribute('id', 'loading-container');
  loading_container.innerHTML = `<img src="/assets/loading.svg" class="loading"/>`;
  document.body.insertBefore(loading_container, document.body.firstChild);
});

input_url.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (input_url.value.trim()) {
      const haveDomain = input_url.value.includes('.');
      const isLinked = input_url.value.startsWith('http://') || input_url.value.startsWith('https://');
      const isHttp = input_url.value.startsWith('http://');
      itemList.push({
        tab_url: haveDomain
          ? isLinked
            ? input_url.value
            : isHttp
            ? `http://${input_url.value}`
            : `https://${input_url.value}`
          : isLinked
          ? `${input_url.value}.com`
          : `${GOOGLE_SEARCH + input_url.value}`,
        title_url: haveDomain ? (isLinked ? input_url.value : `https://${input_url.value}`) : isLinked ? `${input_url.value}.com` : `Search | ${input_url.value}`,
      });
      storage.set({ links: itemList }, async () => {
        const { tab_url, title_url } = itemList[itemList.length - 1];
        const url_data = document.createElement('li');
        const haveFavicon = await fetchFavicon(tab_url);
        url_data.setAttribute('class', 'link');
        url_data.innerHTML = `<input class="checkbox" type="checkbox" />
              <img src="${haveFavicon ? CHROME_FAVICON_API + input_url.value : '/assets/settings.svg'}" style="width: 16px" alt="" />
              <a href="${tab_url}" target="_blank">${title_url}</a>`;
        link_count.textContent = itemList.length;
        url_list.appendChild(url_data);
        input_url.value = '';
      });
    }
  }
});

add_read.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    itemList.push({
      tab_url: tabs[0].url,
      title_url: tabs[0].title,
    });
    storage.set({ links: itemList }, async () => {
      const url_data = document.createElement('li');
      const haveFavicon = await fetchFavicon(tabs[0].url);
      url_data.setAttribute('class', 'link');
      url_data.innerHTML = `<input class="checkbox" type="checkbox" />
              <img src="${haveFavicon ? CHROME_FAVICON_API + tabs[0].url : '/assets/settings.svg'}" style="width: 16px" alt="" />
              <a href="${tabs[0].url}" target="_blank">${tabs[0].title}</a>`;
      link_count.textContent = itemList.length;
      url_list.appendChild(url_data);
    });
  });
});

async function attachLinks(link) {
  const { tab_url, title_url } = link;
  const haveFavicon = await fetchFavicon(tab_url);
  const li_url = document.createElement('li');
  li_url.setAttribute('class', 'link');
  li_url.innerHTML = `<input class="checkbox" type="checkbox" />
        <img src="${haveFavicon ? CHROME_FAVICON_API + tab_url : '/assets/settings.svg'}" style="width: 16px" alt="" />
        <a href="${tab_url}" target="_blank">${title_url}</a>`;
  return li_url;
}

undo_delete.addEventListener('click', () => {
  let toRestore = [];
  if (deleted_links.length > 0) {
    deleted_links[deleted_links.length - 1].forEach((link) => {
      itemList.push(link);
      toRestore.push(link);
    });
    deleted_links.pop();
    link_count.textContent = itemList.length;
    Promise.all(toRestore.map(async (link) => await attachLinks(link))).then((links) => links.forEach((link) => url_list.appendChild(link)));
  }
});

trash_read.addEventListener('click', () => {
  const checkedLinks = document.querySelectorAll('.checkbox');
  if (checkedLinks.length > 0) {
    let undo_temp = [];
    let result = false;

    checkedLinks.forEach((list) => {
      result = result || list.checked;
    });
    if (!result) {
      checkedLinks.forEach((list) => {
        list.checked = true;
      });
      return;
    }
    for (let i = checkedLinks.length - 1; i >= 0; i--) {
      if (checkedLinks[i].checked) {
        undo_temp.push(itemList[i]);
        itemList.splice(i, 1);
        url_list.removeChild(url_list.childNodes[i]);
      }
    }
    deleted_links.push(undo_temp);
    link_count.textContent = itemList.length;
    storage.set({ links: itemList });
  }
});

add_all.addEventListener('click', () => {
  add_all.style.display = 'none';
  const yes = document.createElement('button');
  const no = document.createElement('button');
  const div = document.createElement('div');
  yes.setAttribute('class', 'confirm-buttons');
  no.setAttribute('class', 'confirm-buttons');
  yes.setAttribute('id', 'yes-confirm');
  no.setAttribute('id', 'no-confirm');
  div.setAttribute('id', 'confirm-container');
  yes.innerHTML = `<img src="/assets/check.svg"></img>`;
  no.innerHTML = `<img src="/assets/x.svg"></img>`;
  yes.style.opacity = '0';
  setTimeout(() => {
    yes.style.opacity = '1';
  }, 0);
  div.appendChild(no);
  div.appendChild(yes);
  add_buttons.insertBefore(div, add_buttons.firstChild);
  yes.addEventListener('click', (e) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        itemList.push({
          tab_url: tab.url,
          title_url: tab.title,
        });
        createLink(tab);
      });
      storage.set({ links: itemList });
      link_count.textContent = itemList.length;
    });
    e.target.removeEventListener('click', () => {});
    e.target.remove();
    div.remove();
    add_all.style.display = 'initial';
  });
  no.addEventListener('click', (e) => {
    e.target.removeEventListener('click', () => {});
    div.remove();
    e.target.remove();
    add_all.style.display = 'initial';
  });
});

async function createLink(tab) {
  const haveFavicon = await fetchFavicon(tab.url);
  const url_data = document.createElement('li');
  url_data.setAttribute('class', 'link');
  url_data.innerHTML = `<input class="checkbox" type="checkbox" />
      <img src="${haveFavicon ? CHROME_FAVICON_API + tab.url : '/assets/settings.svg'}" style="width: 16px" alt="" />
      <a href="${tab.url}" target="_blank">${tab.title}</a>`;
  url_list.appendChild(url_data);
}

/* Fetch Favicon */
async function fetchFavicon(url) {
  try {
    if (faviconCache[url]) {
      return true;
    } else if (url.includes('http') || url.includes('.com')) {
      return fetch(CHROME_FAVICON_API + url)
        .then((response) => {
          if (response.ok) {
            faviconCache[url] = true;
            return true;
          } else {
            console.log('Too many requests in a short time: ');
            return false;
          }
        })
        .catch((error) => {
          console.error(error);
          return false;
        });
    }
    return false;
  } catch (error) {
    console.error('Error fetching favicon: ' + error);
    return false;
  }
}
