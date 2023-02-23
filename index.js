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

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

  await page.goto('https://www.douban.com/');
  // await new Promise(r => setTimeout(r, 1000));

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

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
  await page.waitForNavigation();

  // https://www.douban.com/mine/
  // 点击我的豆瓣按钮跳到个人页面
  const mimeBtn = await page.$('#db-nav-sns a[href="https://www.douban.com/mine/"]');
  await mimeBtn.click();

  // 跳转到个人页面
  await page.waitForNavigation();

  // 点击日记按钮跳到日记页
  const diaryBtn = await page.$('#db-usr-profile a[href="https://www.douban.com/people/73238010/notes"]');
  await diaryBtn.click();

  //   await browser.close();
})();
