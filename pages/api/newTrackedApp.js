import airtable from '../../utils/airtable';
import ensureMethod from '../../utils/ensureMethod';
import slackPostMessage from '../../utils/slackPostMessage';
import transcript from '../../utils/transcript';

export default async (req, res) => {
  ensureMethod({ req, method: 'POST' })

  try {

    const { dbRecordID } = req.body

    const appDB = (await airtable.find('Application Database', dbRecordID)).fields;
    const possibleDuplicateTracker = await airtable.find('Application Tracker', `{App ID}='${dbRecordID}'`)
    if (possibleDuplicateTracker) {
      // uh oh... we're not in kansas anymore

      //(msw) I expect this record to not
      // already exist. if it does, something weird happened and I don't want this
      // script running by itself without human oversight– let's just skip and
      // return a 200

      res.send(200)
      return
    }
    const appTracked = await airtable.create('Application Tracker', {
      "Venue": appDB["School Name"],
      "Location": appDB["School Address"],
      "Leader(s)": appDB["Full Name"].join(","),
      "Leaders' Emails": appDB["Leaders Emails"].join(","),
      "Applied": new Date().toISOString().slice(0, 10),
      "Status": "applied",
      "Application": `https://application-viewer.hackclub.dev/?app=${dbRecordID}`,
      "App ID": dbRecordID,
    })

    const channel = 'GLG8GQAKU' /* #application-committee */
    const text = transcript('application-committee.new-application', {
      url: appTracked.fields["Application"],
      location: appTracked.fields["Location"],
    })
    await slackPostMessage({ channel, text })

    res.send(200)
  } catch (err) {
    console.error(err)
    res.send(err).status(500)
  }
}