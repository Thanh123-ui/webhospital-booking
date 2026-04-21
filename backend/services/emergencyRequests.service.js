const db = require('../data/db');

class EmergencyRequestsService {
  normalizePhone(phone = '') {
    return String(phone).trim();
  }

  async hasRecentDuplicate(phone) {
    const normalizedPhone = this.normalizePhone(phone);
    const requests = await db.getEmergencyRequests();
    const now = Date.now();

    return requests.some((request) => {
      if (this.normalizePhone(request.phone) !== normalizedPhone) return false;
      if (!['PENDING', 'IN_PROGRESS'].includes(request.status)) return false;

      const createdAt = new Date(request.createdAt || request.requestedAt || 0).getTime();
      if (!createdAt) return false;

      return now - createdAt < 15 * 60 * 1000;
    });
  }

  async hasEmergencySpam(phone) {
    const normalizedPhone = this.normalizePhone(phone);
    const requests = await db.getEmergencyRequests();
    const now = Date.now();

    const recentAttempts = requests.filter((request) => {
      if (this.normalizePhone(request.phone) !== normalizedPhone) return false;
      const createdAt = new Date(request.createdAt || request.requestedAt || 0).getTime();
      if (!createdAt) return false;
      return now - createdAt < 30 * 60 * 1000;
    });

    return recentAttempts.length >= 3;
  }

  async createEmergencyRequest(data) {
    const requesterName = String(data.name || '').trim();
    const phone = this.normalizePhone(data.phone);
    const symptoms = String(data.symptoms || '').trim();
    const location = String(data.location || data.address || '').trim();

    if (!requesterName) throw new Error('Thiếu tên người gửi yêu cầu cấp cứu.');
    if (!phone) throw new Error('Thiếu số điện thoại liên hệ.');
    if (!symptoms) throw new Error('Thiếu mô tả tình trạng khẩn cấp.');

    if (await this.hasRecentDuplicate(phone)) {
      throw new Error('Hệ thống đã ghi nhận một yêu cầu cấp cứu đang chờ xử lý cho số điện thoại này. Vui lòng giữ máy và chờ tổng đài viên liên hệ.');
    }

    if (await this.hasEmergencySpam(phone)) {
      throw new Error('Bạn đã gửi quá nhiều yêu cầu cấp cứu trong thời gian ngắn. Vui lòng gọi trực tiếp Hotline 115 hoặc 1900 1234 để được hỗ trợ ngay.');
    }

    const requestId = await db.nextEmergencyRequestId();
    const request = {
      id: requestId,
      code: `SOS-${String(1000 + requestId).slice(-4)}`,
      requesterName,
      phone,
      symptoms,
      location,
      status: 'PENDING',
      history: [{
        date: new Date().toISOString(),
        action: 'Tạo yêu cầu cấp cứu',
        by: requesterName,
      }],
      createdAt: new Date().toISOString(),
      handledAt: null,
      handledBy: null,
      handledByName: null,
    };

    await db.saveEmergencyRequest(request);
    return request;
  }

  async getAllEmergencyRequests() {
    return db.getEmergencyRequests();
  }

  async updateEmergencyRequestStatus(id, data, user) {
    const request = await db.findEmergencyRequestById(parseInt(id, 10));
    if (!request) throw new Error('Không tìm thấy yêu cầu cấp cứu.');

    const nextStatus = String(data.status || '').trim().toUpperCase();
    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELED'];
    if (!allowedStatuses.includes(nextStatus)) {
      throw new Error('Trạng thái yêu cầu cấp cứu không hợp lệ.');
    }

    const history = Array.isArray(request.history) ? request.history : [];
    history.push({
      date: new Date().toISOString(),
      action: `Đổi trạng thái yêu cầu cấp cứu -> ${nextStatus}`,
      by: user.name || user.role,
    });

    const fields = {
      status: nextStatus,
      history,
    };

    if (nextStatus === 'IN_PROGRESS' || nextStatus === 'RESOLVED') {
      fields.handledAt = new Date().toISOString();
      fields.handledBy = user.id || null;
      fields.handledByName = user.name || user.role;
    }

    return db.updateEmergencyRequest(parseInt(id, 10), fields);
  }
}

module.exports = new EmergencyRequestsService();
