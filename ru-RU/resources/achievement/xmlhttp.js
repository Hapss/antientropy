var xmlHttp;
var data = [];
var user_info = [];

function SendAjax(endid)
{
    xmlHttp=GetXmlHttpObject();
    if (xmlHttp==null)
    {
        alert ("Browser does not support HTTP Request")
        return
    } 
    var url="./utils/getaward.php?endid="+base64Encode(uid+endid)+"&sid="+Math.random()+"&"+param_str;
    xmlHttp.onreadystatechange=function(){stateChanged(endid)};;
    xmlHttp.open("GET",url,false);
    xmlHttp.send(null);
}

function stateChanged(endid)
{
    if (xmlHttp.readyState==4 || xmlHttp.readyState=="complete")
    {
        //<table style="width:30%;height:100%;margin:0 auto;"><tbody><tr><td><p>登录已经失效QAQ请重新从游戏公告进入活动页面~(请务必检查系统时间和时区设置是否正确哦~)</p></td></tr></tbody></table>
        var getdata = xmlHttp.responseText;
        jsondata = eval('(' + getdata + ')');
        if(jsondata["msg"]=="领取成功"){
            alert(notice_arr[endid]);
        }else if(jsondata["msg"]=="链接已失效"){
            alert(httpTips['login_error_tips']);
        }else if(jsondata["msg"]=="不可重复领取"){
            //alert(httpTips['repeat_tips']);
        }else if(jsondata["msg"]=="参数错误"){
            alert(httpTips['param_error_tips']);
        }else{
            window.location.reload();
        }
        //window.location.reload(); 
    }
}

function pv(type)
{
    xmlHttp=GetXmlHttpObject();
    if (xmlHttp==null)
    {
        alert ("Browser does not support HTTP Request")
        return
    } 
    var url="./utils/pv.php?type="+type+"&sid="+Math.random();
    xmlHttp.onreadystatechange=function(){pvstateChanged()};;
    xmlHttp.open("GET",url,true);
    xmlHttp.send(null);
}

function pvstateChanged()
{
    if (xmlHttp.readyState==4 || xmlHttp.readyState=="complete")
    {
        var get_Data = xmlHttp.responseText;
    }
}


function GetXmlHttpObject()
{
    var xmlHttp=null;
    try
    {
        // Firefox, Opera 8.0+, Safari
        xmlHttp=new XMLHttpRequest();
    }
    catch (e)
    {
     // Internet Explorer
        try
        {
            xmlHttp=new ActiveXObject("Msxml2.XMLHTTP");
        }
        catch (e)
        {
            xmlHttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
    }
    return xmlHttp;
}

function setCookie(name,value)
{
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days*24*60*60*1000);
    document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}

///删除cookie
function delCookie(name)
{
    var exp = new Date();
    exp.setTime(exp.getTime() - 1);
    var cval=getCookie(name);
    if(cval!=null) document.cookie= name + "="+cval+";expires="+exp.toGMTString();
}

//读取cookie
function getCookie(name)
{
    var arr = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
    if(arr != null)
    return unescape(arr[2]);
    return null;
}

function GetQueryString(_name)
{
    var reg = new RegExp("(^|&)"+ _name +"=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if(r!=null)
        return(unescape(r[2])); 
    return null;
}