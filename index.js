// const Crawler = require('crawler');

// const c = new Crawler({
//     maxConnections: 3,
//     // This will be called for each crawled page
//     callback: (error, res, done) => {
//         if (error) {
//             console.log(error);
//         } else {
//             const $ = res.$;
//             console.log($.html());
//         }
//         done();
//     }
// });

// c.queue({
//     uri: 'https://www.douban.com/',
//     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
// });

import puppeteer from 'puppeteer';
import TurndownService from 'turndown';
import chalk from 'chalk';
import path from 'path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const createDir = await mkdir(path.join(__dirname, './markdown'), { recursive: true });
console.log(createDir, 'createDir');

// 生成 turndown 对象
const turndownService = new TurndownService();
turndownService.addRule('boldText', {
  filter: (node) => {
    return (
      node.style.fontWeight === 'bold'
      && node.nodeName === 'SPAN'
    )
  },
  replacement: (content) => {
    return ' **' + content + '** '
  }
});

turndownService.addRule('bookCard', {
  filter: (node) => {
    return (
      node.className === 'subject-container'
      && node.nodeName === 'DIV'
    )
  },
  replacement: (content, node) => {
    const h = node.innerHTML;
    const bookLink = h.match(/<a\s+href=\"(.*?)\">/)[1];
    const bookName = h.match(/<span\s+class="title-text">(.*?)<\/span>/)[1];
    return `[${bookName}-豆瓣链接](${bookLink})`;
  }
});

// 写入md文件到本地
async function writeMarkdownFile (fileName, str) {
  const writeFileRes = await writeFile(path.join(__dirname, './markdown', fileName), str);
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

  await page.goto('https://www.douban.com/');
  // await new Promise(r => setTimeout(r, 1000));

  // Set screen size
  await page.setViewport({ width: 1080, height: 2024 });

  // // 找到登录区域的 iframe，然后切换到账号密码登录
  // const frame = await page.frames().find(i => i.url().includes('passport/login_popup'));
  // await frame.waitForSelector('li.account-tab-account');
  // const loginTab = await frame.$('li.account-tab-account');
  // await loginTab.click();

  // // 输入账号名和密码
  // await frame.type('#username', 'xxxxxx');
  // await frame.type('#password', 'xxxxxx');

  // // 点击登录按钮
  // const loginBtnSelector = '.account-anonymous .account-form-field-submit .btn';
  // const loginBtn = await frame.waitForSelector(loginBtnSelector);
  // await loginBtn.click();

  // 自动切换到扫码登录然后等待用户扫码登陆
  const loginFrame = await page.frames().find(i => i.url().includes('passport/login_popup'));
  const qrcodeSwitch = await loginFrame.waitForSelector('.quick.icon-switch ');
  await qrcodeSwitch.click();

  // 等待用户扫码登陆成功后会自动跳转一次，说明登陆成功
  await page.waitForNavigation({
    timeout: 0,
  });

  // https://www.douban.com/mine/
  // 点击我的豆瓣按钮跳到个人页面
  const mimeBtn = await page.$('#db-nav-sns a[href="https://www.douban.com/mine/"]');
  await mimeBtn.click();

  // 跳转到个人页面
  await page.waitForNavigation({
    timeout: 0,
  });

  // 点击日记按钮跳到日记页
  const diaryBtn = await page.$('#db-usr-profile a[href="https://www.douban.com/people/73238010/notes"]');
  await diaryBtn.click();

  // 跳转到日记页
  await page.waitForNavigation({
    timeout: 0,
  });

  // 获取一共多少页
  const pages = await page.$$eval('.paginator a', (el) => {
    el.pop();
    return el.map(i => i.innerHTML);
  });
  const pageTotal = Number(pages[pages.length - 1]);
  console.log(chalk.cyanBright('总页数：'), chalk.yellow(`${pageTotal}`));

  // 处理当前页面所有文章
  const getCurrentPageNote = async (currentPage) => {
    // 获取本页有多少篇文章
    const currentPageNoteCount = (await page.$$('.note-header-container')).length;
    console.log(chalk.green('本页有文章'), chalk.red(`${currentPageNoteCount}`), chalk.green('篇'));

    // 获取到当前页面内所有文章的链接
    // const currentPageLinks = await page.$$('.note-header-container a:not(.rr a)');
    const noteLinks = await page.$$eval('.note-header-container a:not(.rr a)', (el) => {
      return el.map(i => i.href);
    });
    
    for (const [index, noteLink] of noteLinks.entries()) {
      const href = noteLink;
      const notePage = await browser.newPage();
      await notePage.goto(href);
      await notePage.setViewport({ width: 1080, height: 2024 });
      const html = await notePage.$eval('#link-report .note', (ele) => ele.innerHTML);
      const noteName = await notePage.$eval('.note-header-container h1', (ele) => ele.innerHTML);
      const noteRealeaseDate = await notePage.$eval('.note-header-container .pub-date', (el) => el.innerHTML);
      notePage.close();
      console.log(chalk.cyanBright('当前处理文章：'), chalk.red(`${noteName}`));
      const markdown = turndownService.turndown(html);
      await writeMarkdownFile(`${(currentPage - 1) * currentPageNoteCount + index + 1}.${noteRealeaseDate}.${noteName}.md`, `# ${noteName}\n${markdown}`);
    }
  };

  // 循环处理每一页
  const pageArr = new Array(pageTotal).fill().map((i, index) => index + 1);
  for (let currentPage of pageArr) {
    console.log(chalk.magenta('当前页数：'), chalk.yellow(`${currentPage}`));
    if (currentPage !== 1) {
      const nextPageBtn = await page.$('.paginator .next a');
      await nextPageBtn.click();
      await page.waitForNavigation({
        timeout: 0,
      });
    }
    await getCurrentPageNote(currentPage);
  }

    await browser.close();
})();
