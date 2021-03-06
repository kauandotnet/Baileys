import { Presence, ChatModification, delay } from '../WAConnection/WAConnection'
import {promises as fs} from 'fs'
import * as assert from 'assert'
import fetch from 'node-fetch'
import { WAConnectionTest, testJid } from './Common'

WAConnectionTest('Misc', (conn) => {
    it('should tell if someone has an account on WhatsApp', async () => {
        const response = await conn.isOnWhatsApp(testJid)
        assert.strictEqual(response, true)

        const responseFail = await conn.isOnWhatsApp('abcd@s.whatsapp.net')
        assert.strictEqual(responseFail, false)
    })
    it('should return the status', async () => {
        const response = await conn.getStatus(testJid)
        assert.strictEqual(typeof response.status, 'string')
    })
    it('should update status', async () => {
        const newStatus = 'v cool status'

        const waitForEvent = new Promise (resolve => {
            conn.on ('user-status-update', ({jid, status}) => {
                if (jid === conn.user.id) {
                    assert.equal (status, newStatus)
                    conn.removeAllListeners ('user-status-update')
                    resolve ()
                }
            })
        })

        const response = await conn.getStatus()
        assert.strictEqual(typeof response.status, 'string')

        await delay (1000)

        await conn.setStatus (newStatus)
        const response2 = await conn.getStatus()
        assert.equal (response2.status, newStatus)

        await waitForEvent

        await delay (1000)

        await conn.setStatus (response.status) // update back
    })
    it('should return the stories', async () => {
        await conn.getStories()
    })
    it('should change the profile picture', async () => {
        await delay (5000)

        const ppUrl = await conn.getProfilePicture(conn.user.id)
        const fetched = await fetch(ppUrl, { headers: { Origin: 'https://web.whatsapp.com' } })
        const buff = await fetched.buffer ()

        const newPP = await fs.readFile ('./Media/cat.jpeg')
        const response = await conn.updateProfilePicture (conn.user.id, newPP)

        await delay (10000)

        await conn.updateProfilePicture (conn.user.id, buff) // revert back
    })
    it('should return the profile picture', async () => {
        const response = await conn.getProfilePicture(testJid)
        assert.ok(response)
        assert.rejects(conn.getProfilePicture('abcd@s.whatsapp.net'))
    })
    it('should send typing indicator', async () => {
        const response = await conn.updatePresence(testJid, Presence.composing)
        assert.ok(response)
    })
    it('should mark a chat unread', async () => {
        const waitForEvent = new Promise (resolve => {
            conn.on ('chat-update', ({jid, count}) => {
                if (jid === testJid) {
                    assert.ok (count < 0)
                    conn.removeAllListeners ('chat-update')
                    resolve ()
                }
            })
        })
        await conn.sendReadReceipt(testJid, null, -2)
        await waitForEvent
    })
    it('should archive & unarchive', async () => {
        await conn.modifyChat (testJid, ChatModification.archive)
        await delay (2000)
        await conn.modifyChat (testJid, ChatModification.unarchive)
    })
    it('should pin & unpin a chat', async () => {
        await conn.modifyChat (testJid, ChatModification.pin)
        await delay (2000)
        await conn.modifyChat (testJid, ChatModification.unpin)
    })
    it('should mute & unmute a chat', async () => {
        const waitForEvent = new Promise (resolve => {
            conn.on ('chat-update', ({jid, mute}) => {
                if (jid === testJid ) {
                    assert.ok (mute)
                    conn.removeAllListeners ('chat-update')
                    resolve ()
                }
            })
        })
        await conn.modifyChat (testJid, ChatModification.mute, 8*60*60*1000) // 8 hours in the future
        await waitForEvent
        await delay (2000)
        await conn.modifyChat (testJid, ChatModification.unmute)
    })
    it('should return search results', async () => {
        const jids = [null, testJid]
        for (let i in jids) {
            const response = await conn.searchMessages('Hello', jids[i], 25, 1)
            assert.ok (response.messages)
            assert.ok (response.messages.length >= 0)
        }
    })

    it('should update presence', async () => {
        const presences = Object.values(Presence)
        for (const i in presences) {
            const response = await conn.updatePresence(testJid, presences[i])
            assert.strictEqual(response.status, 200)

            await delay(1500)
        }
    })
})