const axios = require('axios');

/**
 * WhatsApp Service using Fonnte (popular in Indonesia) or similar API
 * Currently configured as a mock/placeholder that logs to console.
 * 
 * To use a real provider like Fonnte:
 * 1. Register at https://fonnte.com/
 * 2. Get your API TOKEN
 * 3. Set WHATSAPP_API_TOKEN in .env
 */

const sendAttendanceNotification = async (studentName, parentPhone, status, time, date) => {
  try {
    if (!parentPhone) {
      console.log(`[WhatsApp] No parent phone number for student ${studentName}. Skipping notification.`);
      return false;
    }

    // Format phone number: remove non-digits, ensure it starts with 62 (for Indonesia)
    let formattedPhone = parentPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    const message = `
*NOTIFIKASI ABSENSI SISWA*
SD NEGERI [Nama Sekolah]

Yth. Orang Tua / Wali Murid,

Kami menginformasikan bahwa putra/putri Bapak/Ibu:
Nama: *${studentName}*
Tanggal: ${date}
Waktu: ${time}
Status: *${status === 'present' ? 'HADIR' : status === 'late' ? 'TERLAMBAT' : status}*

Terima kasih atas perhatiannya.
    `.trim();

    console.log('📱 [WhatsApp Mock] Sending message to:', formattedPhone);
    console.log('📝 [WhatsApp Mock] Message content:\n', message);

    // UNCOMMENT CODE BELOW TO USE FONNTE API
    /*
    const response = await axios.post('https://api.fonnte.com/send', {
      target: formattedPhone,
      message: message,
    }, {
      headers: {
        'Authorization': process.env.WHATSAPP_API_TOKEN
      }
    });
    console.log('[WhatsApp] API Response:', response.data);
    return response.data.status;
    */

    return true;
  } catch (error) {
    console.error('[WhatsApp] Error sending notification:', error.message);
    return false;
  }
};

module.exports = {
  sendAttendanceNotification
};
