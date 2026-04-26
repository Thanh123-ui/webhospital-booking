const nodemailer = require('nodemailer');
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const env = require('../config/env');

let transporter = null;
let isEthereal = false;

/**
 * Khởi tạo transporter (Nodemailer)
 */
async function createTransport() {
  if (transporter) return transporter;

  const provider = env.emailProvider || 'ethereal';

  if (provider === 'ses') {
    // Sử dụng AWS SES
    const sesClient = new SESClient({
      region: env.awsSesRegion,
      credentials: {
        accessKeyId: env.awsSesAccessKeyId,
        secretAccessKey: env.awsSesSecretAccessKey,
      },
    });

    transporter = nodemailer.createTransport({
      SES: { ses: sesClient, aws: { SendRawEmailCommand } }
    });
    console.log('📧 [Email] Đã cấu hình transporter qua AWS SES');
  } else {
    // Mặc định dùng Ethereal (test local)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    isEthereal = true;
    console.log('📧 [Email] Đã cấu hình transporter qua Ethereal (Test Mode)');
  }

  return transporter;
}

/**
 * Hàm gửi mail chung
 * @param {Object} options - { to, subject, html }
 */
async function sendMail({ to, subject, html }) {
  try {
    const tp = await createTransport();
    const info = await tp.sendMail({
      from: env.emailFrom || '"Hospital System" <noreply@hospital.local>',
      to,
      subject,
      html,
    });

    if (isEthereal) {
      console.log('-----------------------------------------');
      console.log('📧 [Email Test Preview URL]: %s', nodemailer.getTestMessageUrl(info));
      console.log('-----------------------------------------');
    }
    return info;
  } catch (error) {
    console.error('❌ [Email] Lỗi khi gửi mail:', error.message);
    throw error;
  }
}

/**
 * Các template HTML cho email
 */
const emailTemplates = {
  /**
   * Template quên mật khẩu
   */
  otpReset({ name, otp, expiresInMinutes }) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0f5778;">Khôi phục mật khẩu</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Bạn vừa yêu cầu khôi phục mật khẩu tài khoản. Dưới đây là mã xác thực (OTP) của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; padding: 15px 30px; font-size: 24px; font-weight: bold; color: #fff; background-color: #0f5778; border-radius: 8px; letter-spacing: 5px;">
            ${otp}
          </span>
        </div>
        <p style="color: #d9534f; font-size: 14px;">Mã OTP này sẽ hết hạn trong vòng <strong>${expiresInMinutes} phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, xin vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Trân trọng,<br>Ban quản trị Bệnh viện</p>
      </div>
    `;
  },

  /**
   * Template xác nhận đặt lịch khám
   */
  appointmentConfirmed({ name, code, date, time, doctorName, deptName }) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #28a745;">Xác nhận đặt lịch khám thành công</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Cảm ơn bạn đã đặt lịch khám tại bệnh viện của chúng tôi. Dưới đây là thông tin chi tiết về lịch hẹn của bạn:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Mã lịch hẹn:</strong> <span style="color: #0f5778; font-weight: bold;">${code}</span></p>
          <p style="margin: 5px 0;"><strong>Ngày khám:</strong> ${date}</p>
          <p style="margin: 5px 0;"><strong>Giờ khám:</strong> ${time}</p>
          <p style="margin: 5px 0;"><strong>Chuyên khoa:</strong> ${deptName}</p>
          <p style="margin: 5px 0;"><strong>Bác sĩ:</strong> ${doctorName}</p>
        </div>
        <p>Vui lòng đến trước giờ hẹn <strong>15 phút</strong> để thực hiện thủ tục tiếp đón tại quầy Lễ tân.</p>
        <p>Nếu bạn có bất kỳ thay đổi nào, vui lòng liên hệ tổng đài hoặc truy cập ứng dụng để đổi lịch ít nhất 24 giờ trước thời gian khám.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Trân trọng,<br>Ban quản trị Bệnh viện</p>
      </div>
    `;
  }
};

module.exports = {
  createTransport,
  sendMail,
  emailTemplates
};
