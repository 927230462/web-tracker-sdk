import log from './log';
export function injectXHR() {
    let XMLHttpRequest = window.XMLHttpRequest;

    let oldOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
        if (!url.match(/logstores/) && !url.match(/sockjs/)) {
            this.logData = {
                method, url, async, username, password
            }
        }
        return oldOpen.apply(this, arguments);
    }

    let oldSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        if (this.logData) {
            let start = Date.now();
            let handler = (type) => (event) => {
                let duration = Date.now() - start;
                let status = this.status;
                //匹配2xx或者3xx 则不提交日志
                if (/^[2|3].{2}$/.test(status)) {
                    return
                }
                let statusText = this.statusText;
                log.send({//未捕获的promise错误
                    kind: 'STABILITY',//稳定性指标
                    type: 'XHR_ERROR',//xhr
                    eventType: type,//load error abort
                    pathname: this.logData.url,//接口的url地址
                    status: status + "-" + statusText,
                    duration: "" + duration,//接口耗时
                    response: this.response ? JSON.stringify(this.response) : "",
                    params: body || ''
                })
            }
            this.addEventListener('load', handler('load'), false);
            this.addEventListener('error', handler('error'), false);
            this.addEventListener('abort', handler('abort'), false);
        }
        oldSend.apply(this, arguments);
    };
}