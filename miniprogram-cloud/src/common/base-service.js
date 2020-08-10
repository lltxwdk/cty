import wepy from '@wepy/core'
const prefix = '/ybs89231'
export const baseUrl = 'https://www.wutuobangxinyougou.com' + prefix
export const baseImgUrl = 'https://www.wutuobangxinyougou.com'
export const qiniuUrl = ''
export const imgUrl = baseImgUrl + '/public/images'
const genders = ['未知', '男', '女']
import weibo from './weibo-emotions';
let _height = 0
let _statusBarHeight = 0
let _headHeight = 0
const weibo_icon_url = weibo.weibo_icon_url
const emotions = weibo.emotions
export const eventHub = new wepy();
export const weibo_emojis = (function () {
    const _emojis = {}
    for (const key in emotions) {
        if (emotions.hasOwnProperty(key)) {
            const ele = emotions[key];
            for (const item of ele) {
                _emojis[item.value] = {
                    id: item.id,
                    value: item.value,
                    icon: item.icon.replace('/', '_'),
                    url: weibo_icon_url + item.icon
                }
            }
        }
    }
    return _emojis
})()
export const appUpdate = () => {
    const updateManager = wx.getUpdateManager()
    console.log(updateManager);

    updateManager.onCheckForUpdate(function (res) {
        // 请求完新版本信息的回调
        console.log(res.hasUpdate)
    })
    updateManager.onUpdateReady(function () {
        wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用？',
            success(res) {
                if (res.confirm) {
                    // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                    updateManager.applyUpdate()
                }
            }
        })
    })

    updateManager.onUpdateFailed(function () {
        // 新版本下载失败
        showToast('新版本下载失败')
    })
}
export default class BaseService {
    constructor() {
        try {
            if (_height === 0) {
                let res = wx.getSystemInfoSync()
                const { screenHeight, pixelRatio, statusBarHeight } = res
                _height = screenHeight * pixelRatio
                _statusBarHeight = statusBarHeight
                res = wx.getMenuButtonBoundingClientRect();
                if (res) {
                    const { bottom, top } = res;
                    _headHeight = bottom + top - statusBarHeight
                }
            }
            this.db = wx.cloud.database()
        } catch (error) {
            console.log(error);

        }
    }
    showToast(title = '操作失败,重试', icon = 'none') {
        wx.showToast({
            title,
            icon,
            duration: 2000
        })
    }
    isQQ() {
        const sys = wx.getSystemInfoSync();
        if (sys.AppPlatform && sys.AppPlatform === 'qq') {
            return true
        }
        return false
    }
    async getShareImg(fileName, isUrl = false) {
        const token = wx.getStorageSync('token') || ''
        const res = await wepy.wx.downloadFile({
            url: isUrl ? fileName : `${baseUrl}/api/public/image/${encodeURIComponent(qiniuUrl + fileName)}`,
            header: {
                token,
                'Content-Type': 'application/json',
                'from-wx': '16f9d417-03c3-45cc-90c7-d58e4e447ae6'
            },
            method: 'GET'
        });
        if (res.statusCode === 200) {
            return res.tempFilePath
        }
        return null
    }
    parseEmoji(txt) {
        if (!txt) {
            return ''
        }
        return txt
            .split(/(\[[\u4e00-\u9fff,\uff1f,\w]{1,8}\])/)
            .filter(str => str.length > 0).map(str => {
                let obj = {}
                if (/\[([\u4e00-\u9fff,\uff1f,\w]{1,8})\]/.test(str)) {
                    if (weibo_emojis[str]) {
                        obj.type = 1
                        obj.src = weibo_emojis[str].url
                    } else {
                        obj.type = 0
                        obj.value = str
                    }
                } else {
                    obj.type = 0
                    obj.value = str
                }
                return obj
            });
    }
    parseTopic(topic) {
        topic.id = topic._id
        return topic
    }
    async request(url, data, method) {
        const token = wx.getStorageSync('token') || ''
        wx.showNavigationBarLoading()
        return await wepy.wx.request({
            url: baseUrl + url,
            data,
            header: {
                token,
                'Content-Type': 'application/json',
                'from-wx': '16f9d417-03c3-45cc-90c7-d58e4e447ae6'
            },
            method
        }).then(res => {
            console.log(res)
            console.log(url)
            wx.hideNavigationBarLoading()
            return res.data
        }).catch(() => {
            console.log(url)
            wx.hideNavigationBarLoading()
            return {
                code: -1
            }
        })
    }
    async callFunction(controller, action, data) {
        console.log(data);

        return await wx.cloud.callFunction({
            name: 'api',
            data: {
                controller,
                action,
                data
            }
        }).then(res => {
            console.log(res);

            return res.result
        }).catch((err) => {
            console.log(err);

            return {
                code: -1
            }
        })
    }
    getQiniuUrl() {
        return qiniuUrl
    }
    getImgUrl() {
        return imgUrl
    }
    getUser() {
        return wx.getStorageSync('user')
    }
    getSchool() {
        const user = this.getUser()
        if (user) {
            return user.school
        }
        return null
    }
    getUserId() {
        const user = this.getUser()
        console.log(user);

        if (user) {
            return user._id
        }
        return null
    }
    getUserType() {
        const user = this.getUser()
        if (user) {
            return user.userType
        }
        return null
    }
    isBinding() {
        const user = this.getUser()
        if (user) {
            return user.isBinding
        }
        return false
    }
    subscribe(fun) {
        if (this.isQQ()) {
            wx.getSetting({
                success(res) {
                    if (res.authSetting['scope.appMsgSubscribed'] === undefined) {
                        wx.subscribeAppMsg({
                            subscribe: true,
                            success: () => {
                                wx.showToast({
                                    title: '订阅成功'
                                });
                            },
                        })
                    } else if (res.authSetting['scope.appMsgSubscribed']) {
                        wx.showToast({
                            title: '已订阅'
                        });
                    } else {
                        wx.openSetting({
                            success(res) {
                                console.log(res);

                            }
                        })
                    }
                },
                fail: (res) => {
                    console.log(res);

                },
                complete: () => {
                    if (fun) {
                        fun()
                    }
                }
            })
        } else {
            wx.requestSubscribeMessage({
                tmplIds: ['OLvHH_KPw3LPS7ePgFsGhnNPQlQVYylWdS5ZLqvtQqw'],
                success(res) {
                    console.log(res);

                    for (var key in res) {
                        if (key != 'errMsg') {
                            if (res[key] == 'reject') {
                                if (fun) {
                                    fun()
                                } else {
                                    wx.showModal({
                                        title: '订阅消息',
                                        content: '您已拒绝了订阅消息，如需重新订阅请前往设置打开。',
                                        confirmText: '去设置',
                                        success: res => {
                                            if (res.confirm) {
                                                wx.openSetting({});
                                            }
                                        }
                                    });
                                }
                                return;
                            } else {
                                wx.showToast({
                                    title: '成功订阅一次'
                                });
                            }
                        }
                    }
                },
                fail: (res) => {
                    console.log(res);
                },
                complete: () => {
                    if (fun) {
                        fun()
                    }
                }
            });
        }
    }
    async uploadFile(imgs, type) {
        const userId = this.getUserId()
        for (const img of imgs) {
            let fileName = null
            switch (type) {
                case 0: // 头像
                    fileName = `u_${userId}_${new Date().getTime()}`
                    break;
                case 1: // 话题
                    fileName = `t_${userId}_${new Date().getTime()}`
                    break;
                case 2: // 帖子
                    fileName = `p_${userId}_${new Date().getTime()}`
                    break;
                case 3: // 认证
                    fileName = `a_${userId}_${new Date().getTime()}`
                    break;
                default:
                    break;
            }
            console.log(fileName);

            const result = await wx.cloud.uploadFile({
                cloudPath: fileName,
                filePath: img.path, // 文件路径
            }).then(res => {
                return res.fileID
            }).catch(() => {
                return null
            })

            if (result) {
                const urlRes = await wx.cloud.getTempFileURL({
                    fileList: [result]
                })
                const { fileList: [retUrl] = [] } = urlRes || {}

                if (retUrl && retUrl instanceof Object) {
                    img.path = retUrl.tempFileURL
                } else {
                    img.path = null
                }
            } else {
                img.path = null
            }
        }

        return type === 2 ? imgs : imgs[0].path
    }
    parseGender(gender) {
        return genders[gender]
    }
    parseUser(user) {
        user.id = user._id
        user.hasFollow = user.hasFollow || false
        user.sex = user.gender
        user.gender = this.parseGender(user.gender)
        return user
    }
    getHeadHeight() {
        return _headHeight
    }
    getHeight() {
        return _height
    }
    getBaseUrl() {
        return baseUrl
    }
    async post(fuc, loadTxt, successTxt, errTxt) {
        wx.showLoading({
            title: loadTxt,
            mask: true
        });
        const res = await fuc()
        wx.hideLoading()
        if (res.code === 0) {
            this.showToast(successTxt, 'success')
            return true
        }
        let title = errTxt
        if (res.erroCode > 0) {
            title = res.msg
        }
        this.showToast(title)
        return false
    }
    async getTempFileURL(fileID) {
        return await wx.cloud.getTempFileURL({
            fileList: [{
                fileID,
                maxAge: 60 * 60, // one hour
            }]
        }).then(res => {
            return res.fileList && res.fileList[0].tempFileURL || null
        }).catch(error => {
            console.log(error);
            return null
        })
    }
}