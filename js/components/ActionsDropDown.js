import { useState } from "react";
import { accept } from "/js/emails/accept.js";
import { reject } from "/js/emails/reject.js";
import { teacher } from "/js/emails/teacher.js";
import { postData } from "/js/postData.js";
import airtable from "../../utils/airtable";

const EMAILS = {
  accept,
  reject,
  teacher,
}

const EMAILS_SUBJECTS = {
  accept: "Welcome to Hack Club",
  reject: "Hack Club Regrets to Inform You",
  teacher: "Hack Club Regrets to Inform You",
}

const NEW_STATUS = {
  accept: "awaiting onboarding",
  reject: "rejected",
  teacher: "rejected",
}

export const ActionsDropDown = ({ id, entry }) => {
  const [open, setOpen] = useState(false);
  const [responseModal, setResponseModal] = useState({ open: false, type: "" });
  const [responseEmail, setResponseEmail] = useState("")
  
  const setModal = (open, type) => {
    setResponseModal({ open, type });
    setResponseEmail(type !== "" ? EMAILS[type](entry["Leader(s)"]) : "");
  }

  const onAccept = async () => {
    // if accept, create channel, generate invite link
    // for all send response email
    const results = {}

    await Promise.all([
      postData("/api/createCheckinPass", { recordID: id }).then(r => results.checkInPassword = r.password),
      postData("/api/createSlackChannel", { recordID: id }).then(r => results.channelID = r.channelID)
    ])

    const modifiedContent = responseEmail
      .replace('%SLACK_URL%', `https://app.slack.com/client/T0266FRGM/${results.channelID}`)
      .replace('%PASSWORD%', results.checkInPassword)
    
    // send email
    await postData("/api/sendResponse", { 
      emailContent: modifiedContent, 
      emailSubject: EMAILS_SUBJECTS[responseModal.type],
      emailAdresses: entry["Leaders' Emails"].split(",").map(x => x.split(" ").join("+")),
    });

    // update record
    await airtable.patch('Application Tracker', id, {
      "Notes": (entry["Notes"] ? `${entry["Notes"]}\n` : "") + `Updated with webhook: ${responseModal.type}`,
      "Status": NEW_STATUS[responseModal.type],
      'Check-In Pass': results.checkInPassword,
      'Slack Channel ID': results.channelID,
    })

    setResponseModal({ open: false, type: ""})
  }

  return <>
    <div className="application-link" onClick={() => setOpen(!open)}>
      <span>IN PROGRESS: Actions</span>
      <span className="app-link-arrow noselect">{open ? "▽" : "▷"}</span>
    </div>
    { open && <>
        <div className="item-key"><b>Current Status:</b> {entry["Status"]}</div>
        <div className="actions-buttons">
          <button 
            className="action-button accept" 
            onClick={() => setModal(true, "accept")}>
            accept
          </button>
          <button 
            className="action-button reject"
            onClick={() => setModal(true, "reject")}>
            reject
          </button>
          <button 
            className="action-button teacher"
            onClick={() => setModal(true, "teacher")}>
            teacher
          </button>
        </div> 
        <div className="item-key">
          <b>accept:</b> sends acceptance email, creates slack channel, creates leader check-in link, changes status to awaiting onboarding
        </div>
        <div className="item-key"><b>reject:</b> sends rejection email, changes status to rejected</div>
        <div className="item-key"><b>teacher:</b> sends teacher rejection email, changes status to rejected, adds "teacher" to note</div>
      </>
    }
    { responseModal.open && <div className="response-modal">
        Here is the <b>{responseModal.type}</b> email you will respond with:
        <textarea className="response-email" value={responseEmail} onInput={(e) => setResponseEmail(e.target.value)}></textarea>
        <div className="response-modal-buttons">
          <button 
            className="action-button"
            style={{ background: "blue" }}
            onClick={onAccept}>
            send
          </button>
          <button 
            className="action-button"
            style={{ background: "grey" }}
            onClick={() => setResponseModal({ open: false, type: ""})}>
            cancel
          </button>
        </div>
      </div>
    }
  </>
}

// email should include link to give to bouncer on slack which will mark slack account as leader
// will automatically add them to leader channel
// will give them leader permissions?
// can they make leaders
// should they make their own club channel
