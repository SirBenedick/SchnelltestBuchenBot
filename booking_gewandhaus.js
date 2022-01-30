// TODO: catch error
const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-core');
const fs = require('fs');
const d = new Date();
const date = d.getHours() + "-" + d.getMinutes()
const log = require('simple-node-logger').createSimpleFileLogger(date + '.log');

// CAUTION if true this will purchase tickets
const isInProductionMode = true
const runInHeadlessMode = true
const shouldCaptureScreenshots = false
const shouldSendTelegramMessages = true
const persona = {
  name: "Max",
  surname: "Mustermann",
  street: "Straße",
  houseNumber: "74",
  zipcode: "12332",
  city: "city",
  mail: "koyedo8443@yks247.com",
  mobileNumber: "01777238",
  birthday: "01.02.2001",
  gender: "m"
}

// check if directory exists
var dir = './screenshots';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

var logNumber = 1
async function screenshot(runNumber, page) {
  if (shouldCaptureScreenshots) {
    log.debug(logNumber)
    await page.screenshot({ path: dir + '/' + runNumber + '_' + logNumber + '.png' });
    logNumber++;
  }
}
function sendTelegramMessage(chatId, bot, msg) {
  if (shouldSendTelegramMessages) {
    bot.sendMessage(chatId, msg);
  }
}

async function bookTicket(bot, chatId) {
  try {
    const d = new Date();
    const runNumber = d.getHours() + "-" + d.getMinutes() + "-" + d.getSeconds()
    log.info(chatId + " - bookingTicket - " + runNumber)
    sendTelegramMessage(chatId, bot, "[1/4] 🛫 Buchungsprozess wird gestartet...");


    const browser = await puppeteer.launch({
      // executablePath: '/usr/bin/chromium-browser',
      headless: runInHeadlessMode,
      args: [
        '--incognito',
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-sandbox",
      ],
    });
    const page = await browser.newPage();

    async function waitForSelectors(selectors, frame) {
      for (const selector of selectors) {
        try {
          return await waitForSelector(selector, frame);
        } catch (err) {
          console.error(err);
        }
      }
      throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
    }

    async function waitForSelector(selector, frame) {
      if (selector instanceof Array) {
        let element = null;
        for (const part of selector) {
          if (!element) {
            element = await frame.waitForSelector(part);
          } else {
            element = await element.$(part);
          }
          if (!element) {
            throw new Error('Could not find element: ' + part);
          }
          element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
        }
        if (!element) {
          throw new Error('Could not find element: ' + selector.join('|'));
        }
        return element;
      }
      const element = await frame.waitForSelector(selector);
      if (!element) {
        throw new Error('Could not find element: ' + selector);
      }
      return element;
    }

    async function waitForElement(step, frame) {
      const count = step.count || 1;
      const operator = step.operator || '>=';
      const comp = {
        '==': (a, b) => a === b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
      };
      const compFn = comp[operator];
      await waitForFunction(async () => {
        const elements = await querySelectorsAll(step.selectors, frame);
        return compFn(elements.length, count);
      });
    }

    async function querySelectorsAll(selectors, frame) {
      for (const selector of selectors) {
        const result = await querySelectorAll(selector, frame);
        if (result.length) {
          return result;
        }
      }
      return [];
    }

    async function querySelectorAll(selector, frame) {
      if (selector instanceof Array) {
        let elements = [];
        let i = 0;
        for (const part of selector) {
          if (i === 0) {
            elements = await frame.$$(part);
          } else {
            const tmpElements = elements;
            elements = [];
            for (const el of tmpElements) {
              elements.push(...(await el.$$(part)));
            }
          }
          if (elements.length === 0) {
            return [];
          }
          const tmpElements = [];
          for (const el of elements) {
            const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
            if (newEl) {
              tmpElements.push(newEl);
            }
          }
          elements = tmpElements;
          i++;
        }
        return elements;
      }
      const element = await frame.$$(selector);
      if (!element) {
        throw new Error('Could not find element: ' + selector);
      }
      return element;
    }

    async function waitForFunction(fn) {
      let isActive = true;
      setTimeout(() => {
        isActive = false;
      }, 5000);
      while (isActive) {
        const result = await fn();
        if (result) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Timed out');
    }
    {
      const targetPage = page;
      await targetPage.setViewport({ "width": 1200, "height": 800 })
    }
    {
      const targetPage = page;
      const promises = [];
      promises.push(targetPage.waitForNavigation());
      await targetPage.goto('https://covid-testzentrum-leipzig.ticket.io/?onlyTag=kostenlos&lang=de');
      await Promise.all(promises);
    }
    {
      await page.waitForFunction('document.querySelector("body")');
      await page.waitForTimeout(300)
      const targetPage = page;
      const element = await waitForSelectors([["aria/Auswahl bestätigen"], ["body > div.modal.fade.modal-cookie.in > div > div > div.modal-footer > button.btn.btn-text"]], targetPage);
      await element.click();
      await screenshot(runNumber, page)
    }
    {
      const targetPage = page;
      await targetPage.evaluate((x, y) => { window.scroll(x, y); }, 0, 600)
    }
    // book free ticket
    // no need to check if ttimeslot has available tickets, if not it disappears from the webpage 
    {
      await page.waitForTimeout(300)
      const elements = await page.$x('//*[@id="buy"]/table/tbody/tr[1]/td[3]/div/span[2]/button')
      await elements[0].click()
      await screenshot(runNumber, page)
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["aria/weiter  "], ["#page2 > div.actionBar > div > div > a"]], targetPage);
      await element.click();
      await screenshot(runNumber, page)
    }
    sendTelegramMessage(chatId, bot, "[2/4] 👌 Nächstes verfügbares Ticket ausgewählt...");
    // name
    {
      await page.waitForTimeout(300)
      await screenshot(runNumber, page)
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > input"]], targetPage);
      await element.click();
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.name);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.name);
      }
    }
    // surname
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.surname);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.surname);
      }
    }
    // street
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(4) > div.col-sm-9.col-xs-7 > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.street);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.street);
      }
    }
    // house number
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(4) > div.col-sm-3.col-xs-5 > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.houseNumber);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.houseNumber);
      }
    }
    // zip code
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(5) > div.col-xs-4 > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.zipcode);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.zipcode);
      }
    }
    // city
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(5) > div.col-xs-8 > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.city);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.city);
      }
    }
    // country
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(1) > div:nth-child(6) > div > select"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type('DE');
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, "DE");
      }
    }
    // mail - first
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(2) > div:nth-child(1) > div > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.mail);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.mail);
      }
    }
    // mail - second
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(2) > div:nth-child(2) > div > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.mail);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.mail);
      }
    }
    {
      await page.waitForTimeout(1000)
      const targetPage = page;
      await targetPage.evaluate((x, y) => { window.scroll(x, y); }, 0, 230)
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.customerData > div:nth-child(3) > div > div > div:nth-child(3) > label"]], targetPage);
      await element.click();
      await screenshot(runNumber, page)
    }
    // first section completly filled out checkpoint
    {
      await screenshot(runNumber, page)
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["aria/ Daten übernehmen von Ticketkäufer"], ["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(2) > div.form-horizontal > div > div > a.btn.btn-default.btn-block.transferPeopleData"]], targetPage);
      await element.click({ offset: { x: 279.5, y: 24.5625 } });
    }
    {
      const targetPage = page;
      await targetPage.evaluate((x, y) => { window.scroll(x, y); }, 0, 1227)
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(2) > div > input"]], targetPage);
      await element.click({ offset: { x: 237.5, y: 22.328125 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(2) > div > input"]], targetPage);
      await element.click({ offset: { x: 237.5, y: 22.328125 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(2) > div > input"]], targetPage);
      await element.click({ offset: { x: 237.5, y: 22.328125 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(1) > div > input"]], targetPage);
      await element.click({ offset: { x: 245.5, y: 26.890625 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(1) > div > input"]], targetPage);
      await element.click({ offset: { x: 245.5, y: 26.890625 } });
    }

    await screenshot(runNumber, page)
    // phone
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(1) > div > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type('123123123123');
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, "123123123123");
      }
    }
    // birthday
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(2) > div > input"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.birthday);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.birthday);
      }
    }

    // gender
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.persRowPeopleData.person0 > div:nth-child(4) > div:nth-child(3) > div > select"]], targetPage);
      const type = await element.evaluate(el => el.type);
      if (["textarea", "select-one", "text", "url", "tel", "search", "password", "number", "email"].includes(type)) {
        await element.type(persona.gender);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, persona.gender);
      }
    }


    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.form-horizontal > div:nth-child(1) > div > div.checkbox > label"]], targetPage);
      await element.click({ offset: { x: 81.5, y: 7.328125 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.form-horizontal > div:nth-child(3) > div > div > label"]], targetPage);
      await element.click({ offset: { x: 13.5, y: 10.0625 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors([["#page3 > div.container > div > div.col-md-7.col- > div > div.form-horizontal > div:nth-child(4) > div > div > label"]], targetPage);
      await element.click({ offset: { x: 59.5, y: 22.21875 } });
    }

    {
      sendTelegramMessage(chatId, bot, "[3/4] ⏱ Daten eingegeben. Warten auf Ticketerstellung...");
    }

    if (isInProductionMode) {
      // confirm
      await screenshot(runNumber, page)
      {
        const targetPage = page;
        const promises = [];
        promises.push(targetPage.waitForNavigation());
        const element = await waitForSelectors([["#page3 > div.actionBar.page-sub.page3a > div > div > button > span"]], targetPage);
        await element.click();
        await Promise.all(promises);
      }
      await screenshot(runNumber, page)


      // get url for pdf
      var urlToPDF = ""
      {
        await waitForSelectors([["aria/   Tickets downloaden"], ["body > div.wrapper > div.container.container-purchasecomplete > div.row > div.col-sm-7 > div > p:nth-child(4) > a"]], page);
        const urlToPDFArray = await page.evaluate(
          () => Array.from(
            document.querySelectorAll("body > div.wrapper > div.container.container-purchasecomplete > div.row > div.col-sm-7 > div > p:nth-child(4) > a"),
            a => a.getAttribute('href')
          )
        );
        urlToPDF = urlToPDFArray[0]

        await screenshot(runNumber, page)

      }
    }

    await screenshot(runNumber, page)

    await browser.close();

    sendTelegramMessage(chatId, bot, "[4/4] 🥳 Ticket erstellt. Kommt sofort 🚀");
    sendTelegramMessage(chatId, bot, urlToPDF);
    log.info(chatId + ": Buchen erfolgreich beendet")
  }
  catch (e) {
    log.info(chatId + ": Buchen abgestürzt :(")
    log.info(e)
    sendTelegramMessage(chatId, bot, "⚠️ Leider ist der Vorgang abgebrochen 😢");
    sendTelegramMessage(chatId, bot, "Probier ist einfach nochmal 🙆‍♂️");
  }
};


// bookTicket()

module.exports = { bookTicket };