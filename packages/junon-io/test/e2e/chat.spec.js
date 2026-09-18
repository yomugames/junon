const { test, expect } = require('@playwright/test')
const { createNewColonyAndJoin, selectGameMode } = require('./support/join')

// Chat is opened with Enter, which focuses #chat_input, and submitted with
// Enter again (input_controller.js#handleEnter -> chatMenu.submit ->
// emit("ClientChat")). Anything starting with "/" is routed to the command
// system instead of being broadcast (server/entities/player.js#chat).
//
// Replies arrive back as ServerChat and are appended to the history pane as
// .chat_message rows; showChatSuccess/showChatError prefix the text with
// "%success%"/"%error%", which the client strips and turns into a data-success
// or data-error attribute (chat_menu.js#parseServerChat).
const CHAT_INPUT = '#chat_input'
const LOCAL_HISTORY = '#chat_container .local_chat_history'

async function sendChat(page, message) {
  if (!(await page.evaluate(() => window.game.chatMenu.isOpenAndFocused()))) {
    await page.keyboard.press('Enter')
    await expect(page.locator(CHAT_INPUT)).toBeFocused()
  }

  await page.fill(CHAT_INPUT, message)
  await page.keyboard.press('Enter')
}

function chatLines(page) {
  return page.locator(`${LOCAL_HISTORY} .chat_message .chat_content`).allInnerTexts()
}

test.describe('chat', () => {
  test('sends a message that comes back from the server and over the player', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // deliberately not a phrase that appears in the locale files, so
    // i18n.t() leaves it alone on the way through
    const message = 'hello from the e2e harness'

    await sendChat(page, message)

    // The message is not echoed locally - it is broadcast to the sector and
    // comes back over the socket (player.js#chat -> broadcast "ServerChat"),
    // so seeing it in the history means the round trip really happened.
    await expect
      .poll(async () => chatLines(page), { timeout: 10_000 })
      .toContain(message)

    // ...and the same handler puts a bubble over the speaking player
    // (chat_menu.js#onServerChat -> chatUser.createChatBubble)
    expect(await page.evaluate(() => !!window.player.chatBubble)).toBe(true)

    // the input is cleared and the text is kept for the up-arrow history
    // (chat_menu.js#submit)
    await expect(page.locator(CHAT_INPUT)).toHaveValue('')
    expect(await page.evaluate(() => window.game.chatMenu.commandHistory)).toEqual([message])
  })

  test('/help lists the available commands in the chat history', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // "/" opens the chat with the slash already typed
    // (input_controller.js globalKeyUpHandler, keyCode 191)
    await page.keyboard.press('/')
    await expect(page.locator(CHAT_INPUT)).toBeFocused()
    await expect(page.locator(CHAT_INPUT)).toHaveValue('/')

    await page.fill(CHAT_INPUT, '/help')
    await page.keyboard.press('Enter')

    // /help is one of the few commands that runs in any colony
    // (help.js#isNonSandboxCommand), and outside a peaceful one it prints just
    // the always-available commands (help.js#perform)
    await expect
      .poll(async () => chatLines(page), { timeout: 10_000 })
      .toEqual(
        expect.arrayContaining([
          expect.stringContaining('List of commands'),
          expect.stringContaining('/spectate'),
          expect.stringContaining('/hour'),
          expect.stringContaining('/day')
        ])
      )

    // the heading comes through as an error-styled line and the entries as
    // success-styled ones, which is how the pane colours them
    await expect(page.locator(`${LOCAL_HISTORY} .chat_content[data-error='true']`).first())
      .toContainText('List of commands')
    expect(
      await page.locator(`${LOCAL_HISTORY} .chat_content[data-success='true']`).count()
    ).toBeGreaterThan(0)
  })

  test('/help explains a single command when given its name', async ({ page }) => {
    await createNewColonyAndJoin(page)

    await sendChat(page, '/help caption')

    // with an argument, /help prints that command's own getUsage() lines
    // (help.js#perform -> command.getUsage())
    await expect
      .poll(async () => chatLines(page), { timeout: 10_000 })
      .toEqual(
        expect.arrayContaining([
          expect.stringContaining('/caption [type] [text]'),
          expect.stringContaining('Caption types: title, subtitle')
        ])
      )
  })

  test('/caption puts a title on the screen in a sandbox colony', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // /caption is an admin command: BaseCommand#canExecute refuses anything
    // that isn't isNonSandboxCommand() unless the colony is peaceful, so a
    // colony with no game mode picked yet cannot run it. "peaceful" is the mode
    // the menu labels "Sandbox".
    await selectGameMode(page, 'peaceful')

    const caption = 'Colony under attack'
    await sendChat(page, `/caption title ${caption}`)

    // caption title -> player.showError(.., { isTitle: true }) ->
    // game.js#displayError writes into #error_title
    await expect(page.locator('#error_title')).toHaveText(caption, { timeout: 10_000 })

    // a caption is not a chat message; it must not show up in the history
    expect(await chatLines(page)).not.toContain(caption)

    // a second caption replaces the first rather than stacking
    await sendChat(page, '/caption title Power restored')
    await expect(page.locator('#error_title')).toHaveText('Power restored', { timeout: 10_000 })
  })

  test('refuses an admin command in a colony that is not a sandbox', async ({ page }) => {
    await createNewColonyAndJoin(page)

    // no game mode selected, so BaseCommand#canExecute drops the command
    // silently - nothing is drawn and nothing is said
    await sendChat(page, '/caption title Should not appear')
    await page.waitForTimeout(2000)

    await expect(page.locator('#error_title')).toHaveText('')
  })
})
