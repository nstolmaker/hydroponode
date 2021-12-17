import nodemailer from 'nodemailer'
import Consts from '../utils/constants.js'

export class Notifier {
  constructor() {
	  this.mailing = false;
	  this.transporter = nodemailer.createTransport({
	    service: 'SendPulse', // no need to set host or port etc.
	    auth: {
        user: Consts.SENDPULSE_EMAIL,
        pass: Consts.SENDPULSE_PASSWORD
	    }
	  });

	  this.message = {
	    from: "noah@chromaplex.io",
	    to: Consts.SENDPULSE_EMAIL,
	    subject: "🚨 [Hydroponode Notice]",
	    text: "not set" 
	  };
  }


	  sendNotification(message) {
		console.log("sendNotification invoke. mailing is: ", this.mailing);
		this.mailing = true;
		console.warn("🚨 "+message)
		this.message.text = message;
		this.transporter.sendMail(this.message, 
			(err) => { 
				this.mailing = false;
				console.log("sendNotification completed. mailing is: ", this.mailing);
			}
		);
	}
}

