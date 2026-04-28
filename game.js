var base_url = ''
base_url = resPath
var now_galgame_tag = '_2017_anti_entropy_now_galgame'
var now_scene_tag = '_2017_anti_entropy_now_scene'
var now_action_tag = '_2017_anti_entropy_now_action'
var now_galgame = 1
var sceneList = []
var characterData = {} // Объект
var now_scene = -1 // Текущая сцена для сохранения
var now_action = -1
var historyChoiceList = [] // Используется для записи истории выборов в текущей сцене
var uiImageList = new Array()
var showInSceneList = new Array()
var xml_files_all_in_this = {} // Объект для надежного хранения кэша
var loading_xml_files = {} // Объект

var tl_base_url = base_url + '/'

uiImageList.push(
  'auto.png',
  'auto_1.png',
  'cancel.png',
  'close.png',
  'continue.png',
  'dialog.png',
  'dialogBig.png',
  'Label-L.png',
  'Label-M.png',
  'Label-R.png',
  'left.png',
  'load.png',
  'log.png',
  'quickload.png',
  'quicksave.png',
  'remark.png',
  'right.png',
  'save.png',
  'skip.png',
  'skip_1.png',
  'thanks.png'
)

function tryAudio(pauseOrPlay, indexOrInner, countNumber) {
  var audio
  if (indexOrInner == 0) audio = $('#indexbgm')[0]
  else audio = $('#bgm')[0] // Выбор элемента
  if (pauseOrPlay == 0) {
    audio.pause()
    if (!isNaN(audio.duration)) audio.currentTime = 0
    if (indexOrInner == 0) indexAudioPlayingflag = false
    else innerAudioPlayingflag = false
    return // Пауза, немедленное выполнение
  }
  if (countNumber != 0) {
    if (indexOrInner == 0 && indexAudioPlayingflag == false) return
    if (indexOrInner == 1 && innerAudioPlayingflag == false) return
  } else {
    if (indexOrInner == 0) indexAudioPlayingflag = true
    else innerAudioPlayingflag = true
  }
  audio.load()
  if (!isNaN(audio.duration)) audio.currentTime = 0
  $(audio).one('canplay', function () {
    this.play().catch(function () {
      setTimeout(function () {
        tryAudio(1, indexOrInner, countNumber + 1)
      }, 100)
    })
  })
}

//------------------------------------------------------
$(function () {
  preLoadUiImages('ui', uiImageList)
  $('#all').on('selectstart', function () {
    return false
  })
  history.pushState(null, null, document.URL)
  window.addEventListener('popstate', function () {
    history.pushState(null, null, document.URL)
  })
  check_size()

  tryAudio(1, 0, 0)
})

window.onresize = function () {
  check_size()
  if (wrk_check_size()) window.scrollTo(0, 1) // Скрытие панели инструментов браузера
}
window.addEventListener(
  'orientationchange',
  function () {
    window.scrollTo(0, 1) // Скрытие панели инструментов браузера
  },
  false
)
//------------------------------------------------------

// События клика в главном окне------------------------------------
var listenScene // Отслеживание движения сцены
var listenAction // Отслеживание движения строк действий
var listenLoading // Отслеживание движения загрузки архивов
var str_index_in_Autotype // Для анимации пишущей машинки

function setListens(s, a, k) {
  listenScene = s
  listenAction = a
  listenLoading = k
}

$('.galgame-content').click(function () {
  if (listenScene != null && listenAction != null) {
    if (listenLoading != 1) nextAction(listenScene, listenAction) // Следующий шаг
    else Action(listenScene, listenAction, listenLoading) // Возврат статуса
  } else if (
    listenScene == null &&
    listenAction == null &&
    listenLoading != null
  ) {
    if (listenLoading >= 0) {
      if (autoSpeed == 'typing')
        dialogAutoplay('stop') // При автовоспроизведении печати приоритет отдается остановке автовоспроизведения
      else str_index_in_autotype = listenLoading // Настройка состояния пишущей машинки
    } else if (listenLoading == -1) dialogAutoplay('stop') // Обработка изменений автовоспроизведения
    else if (listenLoading == -2) $('.dialog-overflow').stop(true, true) // Немедленное завершение анимации прокрутки экрана
  }
})

var textSpeed = 75
// Связано с глобальными переменными: эффект пишущей машинки
$.fn.autotype_text = function (gotoScene, gotoAction) {
  var str
  var timer_key
  var $pThis = $(this)
  $('.dialog-overflow').scrollTop(0) // Коррекция положения полосы прокрутки перед началом печати

  if (autoSpeed != 'skip') {
    str = $pThis.html()
    if (str.indexOf('<') >= 0) {
      return
    } // Случай внедрения HTML-документа

    if (isdialogAutoplay()) dialogAutoplayAutoStop('autotype')

    $pThis.html('')
    str_index_in_autotype = 0

    setListens(null, null, str.length)

    timer_key = setInterval(function () {
      str_index_in_autotype++
      $pThis.html(str.substring(0, str_index_in_autotype)) // Длина отображаемого в данный момент текста

      if (
        $('.dialog-overflow')[0].scrollHeight > $('.dialog-overflow').height()
      ) {
        // Если содержимое выходит за пределы, отобразить все сразу
        $pThis.html(str)
        str_index_in_autotype = str.length
      }
      if (isdialogAutoplay()) {
        // Автовоспроизведение включено во время анимации набора текста
        $pThis.html(str)
        str_index_in_autotype = str.length
      }
      if (str_index_in_autotype >= str.length) {
        clearInterval(timer_key) // Завершение временного цикла setInterval
        if (isdialogAutoplay()) {
          if (autoSpeed == 'auto') {
            dialogAutoplay('countinue')
          }
        } else if (autoSpeed == 'typing') {
          dialogAutoplay('countinue')
        } else {
          setListens(gotoScene, gotoAction)
        }
      }
    }, textSpeed)
  }
}

// Связано с глобальными переменными: автовоспроизведение
var dialogAutoplayFlag = -1 // Управление автовоспроизведением
var timer_Autoplay // Каждый клик вызывает один и тот же таймер
var autoSpeed = 'stop' // Переменная скорости для skip и autoplay

$('.dialog-btn-autoplay').click(function (e) {
  e.stopPropagation()
  if (listenScene == null && listenAction == null && listenLoading != null) {
    if (listenLoading >= 0) {
      $('.dialog-btn-autoplay').addClass('dialog-btn-autoplay-on')
      dialogAutoplayAutoStop('autotype')
      return
    }
  }
  if (autoSpeed == 'stop') dialogAutoplay('countinue')
  else dialogAutoplay('auto')
})

$('.dialog-btn-skip').click(function (e) {
  e.stopPropagation()
  if (listenScene == null && listenAction == null && listenLoading != null) {
    if (listenLoading >= 0) str_index_in_autotype = listenLoading // Настройка состояния пишущей машинки
  }
  dialogAutoplay('skip')
})

function dialogAutoplay(keySpeed) {
  var tempTimeout
  if (keySpeed == null || keySpeed == 'auto' || keySpeed == 'countinue') {
    // Нажатие auto
    if (autoSpeed == 'skip' && isdialogAutoplay()) {
      // Нажатие auto во время skip
      dialogAutoplayAutoStop()
    }
    autoSpeed = 'auto'
    $('.dialog-btn-autoplay').addClass('dialog-btn-autoplay-on')
  } else if (keySpeed == 'skip') {
    // Нажатие skip
    if (autoSpeed == 'auto' && isdialogAutoplay()) {
      // Нажатие skip во время auto
      dialogAutoplayAutoStop()
    }
    autoSpeed = 'skip'
    $('.dialog-btn-skip').addClass('dialog-btn-skip-on')
  } else {
    dialogAutoplayAutoStop()
    return
  }
  changedialogAutoplayFlag()
  if (isdialogAutoplay()) {
    setListens(null, null, -1) // Изменение события отклика на основную операцию
    if (keySpeed == 'countinue') {
      tempTimeout = baseTime()
    } else {
      tempTimeout = getdialogAutoplaySpeed()
    }
    if (tempTimeout > 0) {
      timer_Autoplay = setTimeout(function () {
        if (autoSpeed == 'auto') {
          $('.dialog-btn-autoplay').addClass('dialog-btn-autoplay-on')
          nextAction(now_scene, now_action)
        } else if (autoSpeed == 'skip') {
          $('.dialog-btn-skip').addClass('dialog-btn-skip-on')
          nextAction(now_scene, now_action, 1)
        }
        dialogAutoplayAutoStop(1)
        if (autoSpeed != 'stop' && autoSpeed != 'typing') {
          dialogAutoplay(autoSpeed)
        }
      }, tempTimeout)
    } else {
      dialogAutoplayAutoStop()
    }
  } else {
    dialogAutoplayAutoStop()
  }
}

function getdialogAutoplaySpeed() {
  if (autoSpeed == 'auto') {
    var overflowTime
    if ($('p')[0]) {
      var textWhole = getText($('p'))
    } else {
      var textWhole = $('.dialog-text').html()
    }
    var textTime = parseInt((baseTime() * textWhole.length) / 10)
    if (textTime < baseTime()) textTime = baseTime()
    if (checkTextScrollLastMove > 0) {
      overflowTime = parseInt(checkTextScrollLastMove)
    } else {
      if (!checkTextScroll()) overflowTime = textTime
      else
        overflowTime = parseInt(
          ((baseTime() * $('.dialog-overflow').height()) /
            parseInt($('.dialog-text').css('line-height'))) *
            2.5
        )
    }
    if (textTime <= overflowTime) {
      return textTime
    } else {
      return overflowTime
    }
  } else if (autoSpeed == 'skip') return baseTime() / 10
  else return -1
}

function isdialogAutoplay() {
  if (dialogAutoplayFlag > 0) return true
  else return false
}

function changedialogAutoplayFlag() {
  dialogAutoplayFlag *= -1
}

function dialogAutoplayAutoStop(keyFlag) {
  dialogAutoplayFlag = -1
  if (keyFlag == null) {
    autoSpeed = 'stop'
    clearTimeout(timer_Autoplay)
    $('.dialog-btn-autoplay').removeClass('dialog-btn-autoplay-on')
    $('.dialog-btn-skip').removeClass('dialog-btn-skip-on')
    setListens(now_scene, now_action)
    timer_Autoplay = null
  } else if (keyFlag == 'autotype') {
    autoSpeed = 'typing'
    clearTimeout(timer_Autoplay)
    timer_Autoplay = null
  }
}

//------------------------------------------------------
// Демонстрация CG
var cgPageIndex = 0
var cgPageLength = 0
var cgListTemp = null

function cgPage(page, flag) {
  var i
  var j
  startLoad()
  if (!page) {
    page = cgPageIndex
  }
  var xmlDoc = loadExistXmlFile('cg_list', function () {
    if (xml_files_all_in_this['cg_list'] === "FAILED") { LoadFinish(); return; }
    cgListTemp = xml_files_all_in_this['cg_list'].getElementsByTagName('cg')
    cgPageLength = cgListTemp.length
    cgPage(page, flag)
  })
  if (!xmlDoc) {
    return
  }
  if (cgPageIndex == 0) {
    $('.pagenum#pagenum-1').addClass('pagenum-gray')
  }
  if ((cgPageIndex + 1) * 4 >= cgPageLength) {
    $('.pagenum#pagenum-2').addClass('pagenum-gray')
  }
  var cgListSort = new Array()
  for (i = 0; cgListTemp[i] != null; i++) {
    j = cgListTemp[i].getAttribute('id')
    cgListSort[Number(j)] = cgListTemp[i]
  }
  for (i = page * 4; i < (page + 1) * 4; i++) {
    $('#cg-' + (i - page * 4)).hide()
  }
  // Предзагрузка (preload)
  var cgImageList = new Array()
  j = 0
  for (i in cgListSort) {
    if (j >= page * 4 && j < (page + 1) * 4) {
      $('#cg-' + (j - page * 4)).unbind()
      cgImageList.push(getText(cgListSort[i]))
    } else if (j >= (page + 1) * 4) {
      break
    }
    j++
  }
  preLoadUiImages('cg', cgImageList)
  // Проверка, завершилась ли загрузка предзагруженных изображений
  if (preLoadImagesCheck() > 0) {
    // Если уже предзагружено
    // Загрузка
    j = 0
    for (i in cgListSort) {
      if (j >= page * 4 && j < (page + 1) * 4) {
        $('#cg-' + (j - page * 4)).css(
          'background-image',
          "url('" + 'ru-RU/resources/cg/' + getText(cgListSort[i]) + "')"
        )
        $('#cg-' + (j - page * 4)).click(
          { str: getText(cgListSort[i]) },
          function (e) {
            showCgOrigin(e.data.str)
          }
        )
        $('#cg-' + (j - page * 4)).show()
      } else if (j >= (page + 1) * 4) {
        break
      }
      j++
    }
    if (flag == null) $('.cg-wrapper').fadeIn()
    cgListSort = null
    LoadFinish()
    return
  }
  var countIndexTimer = 0
  var preLoadImagesTimer = setInterval(function () {
    var i
    var j
    if (preLoadImagesCheck() > 0 || countIndexTimer > 100) {
      // Изображения загружены, либо истекло время ожидания
      clearTimeout(preLoadImagesTimer)
      // Загрузка
      j = 0
      for (i in cgListSort) {
        if (j >= page * 4 && j < (page + 1) * 4) {
          $('#cg-' + (j - page * 4)).css(
            'background-image',
            "url('" + 'ru-RU/resources/cg/' +
              getText(cgListSort[i]) +
              "')"
          )
          $('#cg-' + (j - page * 4)).click(
            { str: getText(cgListSort[i]) },
            function (e) {
              showCgOrigin(e.data.str)
            }
          )
          $('#cg-' + (j - page * 4)).show()
        } else if (j >= (page + 1) * 4) {
          break
        }
        j++
      }
      if (flag == null) $('.cg-wrapper').fadeIn()
      cgListSort = null
      LoadFinish()
      return
    }
    countIndexTimer++
  }, 100)
}

$('.pagenum#pagenum-1').click(function () {
  if (cgPageIndex > 0) {
    if ((cgPageIndex + 1) * 4 >= cgPageLength) {
      $('.pagenum#pagenum-2').removeClass('pagenum-gray')
    }
    cgPageIndex--
    showCGFrame(cgPageIndex)
    if (cgPageIndex == 0) {
      $('.pagenum#pagenum-1').addClass('pagenum-gray')
    }
  }
})

$('.pagenum#pagenum-2').click(function () {
  if ((cgPageIndex + 1) * 4 < cgPageLength) {
    if (cgPageIndex == 0) {
      $('.pagenum#pagenum-1').removeClass('pagenum-gray')
    }
    cgPageIndex++
    showCGFrame(cgPageIndex)
    if ((cgPageIndex + 1) * 4 >= cgPageLength) {
      $('.pagenum#pagenum-2').addClass('pagenum-gray')
    }
  }
})

function showCGFrame(page) {
  $('.cg-frame').hide()
  cgPage(page, 1)
  $('.cg-frame').show()
}
//------------------------------------------------------
function generate_all_characterData(name) {
  var j
  var xmlDoc
  xmlDoc = loadExistXmlFile(name, function () {
    generate_all_characterData(name)
  })
  if (!xmlDoc) return
  if (Object.keys(characterData).length > 0) { // ИСПРАВЛЕНО: Проверка наличия элементов в объекте
    // В этот момент xml уже загружен
    var imageList = xmlDoc.getElementsByTagName('image')
    preLoadImagesBegin(imageList)
    return
  }
  xmlDoc = loadExistXmlFile('characterData', function () {
    generate_all_characterData(name)
  })
  if (!xmlDoc) return
  // На данный момент characterData пуста, читаем её со следующей строки
  var characterList = xmlDoc.getElementsByTagName('character')
  for (j = 0; j < characterList.length; j++) {
    var newCharacter = {}
    newCharacter['name'] = characterList[j].getAttribute('name')
    newCharacter['color'] = characterList[j].getAttribute('color')
    newCharacter['src'] = characterList[j].getAttribute('src')
    newCharacter['id'] = characterList[j].getAttribute('id')
    if (!characterData[newCharacter['id']]) {
      characterData[newCharacter['id']] = newCharacter
    } else if (
      characterData[newCharacter['id']]['name'] != newCharacter['name']
    ) {
      console.log(
        'id-' +
          newCharacter['id'] +
          ', Name Contradiction: ' +
          newCharacter['name'] +
          ' vs ' +
          characterData[newCharacter['id']]['name'] +
          '; in line ' +
          j
      )
    } else if (
      characterData[newCharacter['id']]['color'] != newCharacter['color']
    ) {
      console.log(
        'id-' +
          newCharacter['id'] +
          ', Color Contradiction: ' +
          newCharacter['color'] +
          ' vs ' +
          characterData[newCharacter['id']]['color'] +
          '; in line ' +
          j
      )
    } else if (
      characterData[newCharacter['id']]['src'] != newCharacter['src']
    ) {
      console.log(
        'id-' +
          newCharacter['id'] +
          ', SRC Contradiction: ' +
          newCharacter['src'] +
          ' vs ' +
          characterData[newCharacter['id']]['src'] +
          '; in line ' +
          j
      )
    }
  }
  // В этот момент xml уже загружен
  xmlDoc = loadExistXmlFile(name)
  if (!xmlDoc || xmlDoc === "FAILED") return; // Защита от отсутствующего файла
  var imageList = xmlDoc.getElementsByTagName('image')
  preLoadImagesBegin(imageList)
}

function galgame(name) {
  var i
  var j
  var thisSceneTemp
  var uselessTexts
  var number_name = Number(name.replace(/[^0-9]/gi, ''))

  now_galgame = number_name
  now_scene = -1
  now_action = -1
  ClearCharas()
  ClearDialog()
  startLoad()

  var xmlDoc = loadExistXmlFile(name, function () {
    galgame(name)
  })
  if (!xmlDoc) return
  //--Сделать идентификатор scene значимым в sceneList
  var sceneList0 = []
  sceneList0 = xmlDoc.getElementsByTagName('scene')
  sceneList = new Array()
  for (i = 0; sceneList0[i] != null; i++) {
    thisSceneTemp = sceneList0[i]
    uselessTexts = new Array()
    for (j = 0; thisSceneTemp.childNodes[j] != null; j++) {
      if (thisSceneTemp.childNodes[j].nodeName == '#text') {
        uselessTexts.push(thisSceneTemp.childNodes[j])
      }
    }
    for (j = 0; uselessTexts[j] != null; j++) {
      thisSceneTemp.removeChild(uselessTexts[j])
    } // Удаляем все элементы #text на этом этапе
    j = thisSceneTemp.getAttribute('id')
    sceneList[Number(j)] = thisSceneTemp
    sceneList0[i] = null
    uselessTexts = null
    thisSceneTemp = null
  }
  sceneList0 = null
  //--
  generate_all_characterData(name)
}

function startLoad() {
  $('#loading').show()
}

function LoadFinish() {
  $('#loading').hide()
}

function baseTime() {
  return 1000
}

var checkTextScrollLastMove = 0

function checkTextScroll() {
  var scrollTop0 = $('.dialog-overflow')[0].scrollTop
  var scrollHeight0 = $('.dialog-overflow')[0].scrollHeight
  var showHeight = $('.dialog-overflow').height()
  var lineHeight = parseInt($('.dialog-text').css('line-height'))
  var scrollTop1 = scrollTop0 + showHeight
  if (scrollTop0 + showHeight <= scrollHeight0 - lineHeight) {
    if (scrollTop1 + showHeight > scrollHeight0) {
      scrollTop1 = scrollHeight0 - showHeight
    }
    return {
      scrollTop: scrollTop1,
      textLenth: (baseTime() / 5) * ((scrollTop1 - scrollTop0) / lineHeight),
    }
  } else if (scrollTop0 + showHeight < scrollHeight0 - lineHeight / 5) {
    return { scrollTop: scrollTop1, textLenth: baseTime() / 20 } // Ситуация с накоплением ошибок
  } else {
    return null // Достигнут конец
  }
}

var lastEventNode = 0

function Action(gotoScene, gotoAction, skipKey, loadKey2) {
  var thisScene
  var thisEvent
  // Сначала оцениваем прокрутку текста, чтобы завершить отображение текущего текста в приоритетном порядке
  checkTextScrollLastMove = 0
  if (!skipKey && autoSpeed != 'skip' && gotoScene == now_scene) {
    // Если это не загрузка архива
    var checkTextScroll_answer = checkTextScroll()
    if (checkTextScroll_answer != null) {
      checkTextScrollLastMove = checkTextScroll_answer.textLenth * 5 * 2.5
      $('.dialog-overflow').animate(
        { scrollTop: checkTextScroll_answer.scrollTop },
        {
          duration: checkTextScroll_answer.textLenth,
          start: function () {
            if (autoSpeed == 'auto' || autoSpeed == 'typing')
              dialogAutoplayAutoStop('autotype')
          },
          step: function () {
            if (autoSpeed == 'stop') {
              setListens(null, null, -2) // Событие клика быстро завершает анимацию
            } else if (autoSpeed == 'skip') {
              $('.dialog-overflow').stop(true, true)
            }
          },
          done: function () {
            if (autoSpeed == 'skip') {
              dialogAutoplay('skip')
            } else if (autoSpeed == 'auto') {
              dialogAutoplayAutoStop(1)
              dialogAutoplay('auto')
            } else if (autoSpeed == 'typing') {
              dialogAutoplayAutoStop(1)
              dialogAutoplay('auto')
            } else {
              setListens(gotoScene, lastEventNode)
            }
          },
        }
      )
      return
    }
  }
  if (autoSpeed == 'stop') setListens(gotoScene, gotoAction) // Нормальное состояние
  //--
  remark_btn_hide()
  $('.choice_list').hide()
  $('.choice_list').html('')

  thisScene = sceneList[gotoScene]

  if (gotoAction < 2) {
    historyChoiceList = new Array() // Очистить отметки выбора
  }
  thisEvent = thisScene.childNodes[gotoAction]

  if (gotoScene != now_scene) {
    ClearCharas()
    ClearDialog()
    if (thisScene.getAttribute('background')) {
      if (
        thisScene.getAttribute('background') == 'black' ||
        thisScene.getAttribute('background') == 'white'
      ) {
        $('.background').css('background', thisScene.getAttribute('background'))
      } else {
        var size = '100%'
        if (thisScene.getAttribute('size')) {
          size = thisScene.getAttribute('size')
        }
        $('.background')
          .removeAttr('background')
          .css(
            'background',
            "url('" +
            'ru-RU/resources/background/' +
              thisScene.getAttribute('background') +
              "') no-repeat"
          ) // Добавленный атрибут white удаляется, иначе он мгновенно прыгнет на белый цвет
          .css('background-size', size + ' ' + size)
          .css('background-position', 'center')
      }
    } else {
      $('.background').css('background', 'black')
    }
  }

  now_scene = gotoScene
  now_action = gotoAction

  if (!thisEvent) {
    if (!skipKey || !loadKey2) {
      nextAction(gotoScene, gotoAction, skipKey)
    }
    return
  }
  processAction(thisEvent, gotoScene, gotoAction, skipKey, loadKey2)
}

function processAction(act, gotoScene, gotoAction, skipKey, loadKey2) {
  if ($.inArray(act.nodeName, ['text', 'speak', 'choices']) >= 0) {
    $('#all').show()
  }
  switch (act.nodeName) {
    case 'cg':
      if (skipKey) {
        if (loadKey2) return // Пропуск CG при загрузке архива
      }
      dialogAutoplay('stop') // Принудительно прекратить автовоспроизведение
      lastEventNode = gotoAction
      $('#all').hide()
      var fadeInTimeCG = 300
      var fadeOutTimeCG = 300
      if (act.getAttribute('fadeIn') != null) {
        fadeInTimeCG = Number(act.getAttribute('fadeIn'))
      }
      if (act.getAttribute('fadeOut') != null) {
        fadeOutTimeCG = Number(act.getAttribute('fadeOut'))
      }
      if (act.getAttribute('bg') != null) {
        $('.cgBackground')
          .css(
            'background',
            "url('" +
            'ru-RU/resources/background/' +
              act.getAttribute('bg') +
              "') no-repeat"
          )
          .css('background-size', 'auto 100%')
          .css('background-position', 'center')
          .fadeIn(fadeInTimeCG)
      } else {
        $('.cgBackground').hide()
      }
      $('.cg')
        .unbind()
        .css(
          'background',
          "url('" + 'ru-RU/resources/cg/' +
            act.getAttribute('src') +
            "') no-repeat"
        )
        .css('background-size', 'auto 100%')
        .css('background-position', 'center')
        .fadeIn(fadeInTimeCG)
        .click({ gs: gotoScene, ga: gotoAction }, function (e) {
          if (fadeOutTimeCG != 0) $('.cgBackground').fadeOut(fadeOutTimeCG)
          $('.cg').unbind()
          if (fadeOutTimeCG != 0)
            $('.cg').fadeOut(fadeOutTimeCG, function () {
              nextAction(e.data.gs, e.data.ga)
            })
          else nextAction(e.data.gs, e.data.ga)
        })
      break

    case 'blink':
      lastEventNode = gotoAction
      $('#all').hide()
      if (skipKey || autoSpeed == 'skip') {
        // Пропускается при быстрой перемотке вперед или загрузке файла сохранения
        return
      }
      var time = 0.5
      var color = 'white'
      var repeat = 10
      if (act.getAttribute('time')) {
        time = act.getAttribute('time')
      }
      if (act.getAttribute('color')) {
        color = act.getAttribute('color')
      }
      if (act.getAttribute('repeat')) {
        repeat = act.getAttribute('repeat')
      }

      $('.screen')
        .css('background-color', color)
        .css(
          'animation',
          'screenblink ' + time + 'ms linear 0s infinite forwards'
        )
        .css(
          '-moz-animation',
          'screenblink ' + time + 'ms linear 0s infinite forwards'
        )
        .css(
          '-webkit-animation',
          'screenblink ' + time + 'ms linear 0s infinite forwards'
        )
        .css(
          '-o-animation',
          'screenblink ' + time + 'ms linear 0s infinite forwards'
        )
        .show()

      setTimeout(function () {
        $('.screen').hide()
        if (autoSpeed != 'stop') return
        else nextAction(gotoScene, gotoAction)
      }, time * repeat)
      break

    case 'shake':
      lastEventNode = gotoAction
      if (skipKey || autoSpeed == 'skip') {
        // Пропускается при быстрой перемотке вперед или загрузке файла сохранения
        return
      }
      var time = Number(act.getAttribute('time'))
      var id =
        act.getAttribute('position') == 'all'
          ? 'all'
          : 'character-' + act.getAttribute('position')
      var className = act.getAttribute('type') || 'shake'
      $('#' + id).addClass(className)
      setTimeout(function () {
        $('#' + id).removeClass(className)
        if (autoSpeed == 'skip') return
        else if (autoSpeed == 'auto' && time >= baseTime() - 10) return
        else nextAction(gotoScene, gotoAction)
      }, time)
      break

    case 'text':
      lastEventNode = gotoAction
      ClearDialog() // Очистить временно загруженное форматирование
      $('.dialog-chara').hide()
      post_achievement_in_event(act)
      var tempAttribute = act.getAttribute('article')
      var thisTextTemp = null
      if (tempAttribute != null) {
        if (
          tempAttribute == '1' ||
          tempAttribute.indexOf('true') >= 0 ||
          tempAttribute.indexOf('True') >= 0 ||
          tempAttribute.indexOf('TRUE') >= 0
        ) {
          $('.dialog').addClass('dialog_article')
          $('.dialog-overflow').addClass('dialog-overflow_article')
          thisTextTemp = act.innerHTML
        } else {
          $('.dialog').removeClass('dialog_article')
          $('.dialog-overflow')
            .removeClass('dialog-overflow_article')
            .removeClass('dialog-overflow_article_center')
        }
      } else {
        $('.dialog').removeClass('dialog_article')
        $('.dialog-overflow')
          .removeClass('dialog-overflow_article')
          .removeClass('dialog-overflow_article_center')
      }
      if (thisTextTemp == null) thisTextTemp = getText(act)
      tempAttribute = act.getAttribute('remark')
      if (tempAttribute != null) {
        if (
          tempAttribute == '1' ||
          tempAttribute.indexOf('next') >= 0 ||
          tempAttribute.indexOf('Next') >= 0 ||
          tempAttribute.indexOf('NEXT') >= 0
        ) {
          remark_btn_show()
        }
      }
      RefreshDialog(thisTextTemp, gotoScene, gotoAction, skipKey, null)
      break

    case 'speak':
      lastEventNode = gotoAction
      ClearDialog() // Очистить временно загруженное форматирование
      post_achievement_in_event(act)
      $('.dialog').removeClass('dialog_article')
      $('.dialog-overflow')
        .removeClass('dialog-overflow_article')
        .removeClass('dialog-overflow_article_center')
      $('.dialog-chara').show()
      var chara = act.getAttribute('chara')
      var textColour = characterData[chara]['color']
      $('.dialog-chara-text').html(characterData[chara]['name'])
      $('.dialog-chara-text').css('color', textColour)
      var tempAttribute = act.getAttribute('remark')
      if (tempAttribute != null) {
        if (
          tempAttribute == '1' ||
          tempAttribute.indexOf('next') >= 0 ||
          tempAttribute.indexOf('Next') >= 0 ||
          tempAttribute.indexOf('NEXT') >= 0
        ) {
          remark_btn_show()
        }
      }
      RefreshDialog(getText(act), gotoScene, gotoAction, skipKey, textColour)
      break

    case 'choices':
      lastEventNode = gotoAction
      if (skipKey) {
        if (loadKey2) return // Во время процесса загрузки пропустить
      }
      dialogAutoplay('stop') // Принудительно прекратить автовоспроизведение
      var choiceList = act.childNodes
      var choices = []
      for (var i = 0; i < choiceList.length; i++) {
        if (choiceList[i].nodeName != '#text') {
          if (choiceList[i].getAttribute('exit') != 'no') {
            if (choiceList[i].getAttribute('goto') == null) {
              choices.push({
                text: getText(choiceList[i]),
                continueScene: gotoScene,
                continueAction: gotoAction,
              }) // Выбор конечности не дает никакого эффекта
            } else {
              choices.push({
                text: getText(choiceList[i]),
                goto: choiceList[i].getAttribute('goto'),
                change: choiceList[i].getAttribute('change'),
              })
            }
          }
        }
      }
      ShowDialog(2, choices)
      break

    case 'show':
      lastEventNode = gotoAction
      var position = act.getAttribute('position')
      if (!position) {
        position = 'center'
      }
      var opacityTemp = act.getAttribute('opacity')
      if (!opacityTemp) {
        opacityTemp = 1
      }
      opacityTemp = Number(opacityTemp)
      var chara = act.getAttribute('chara')
      if (chara) {
        if (characterData[chara]) {
          var url =
            "url('" +
            'ru-RU/resources/chara/' +
            characterData[chara]['src'] +
            "') 50% 50% /auto 100%  no-repeat"
          var positionLeft = []
          positionLeft['mostleft'] = '-50'
          positionLeft['left'] = '-25'
          positionLeft['center'] = '0'
          positionLeft['back'] = '0'
          positionLeft['right'] = '25'
          positionLeft['mostright'] = '50'
          var pDivTemp = $('.character-' + position).children()
          if (pDivTemp.length) {
            if (!act.getAttribute('time') || skipKey) {
              pDivTemp
                .addClass('character-pic')
                .css('margin-left', positionLeft[position] + '%')
                .css('opacity', opacityTemp)
                .css('background', url)
            } else {
              var transTime = Math.abs(Number(act.getAttribute('time')))
              var pDivTemp2 = $('<div></div>')
              pDivTemp2
                .addClass('character-pic')
                .css('margin-left', positionLeft[position] + '%')
                .css('opacity', opacityTemp)
                .css('background', url)
                .css('display', 'none')
              $('.character-' + position).append(pDivTemp2)
              pDivTemp.fadeOut(transTime, function () {
                $(this).remove()
              })
              pDivTemp2.fadeIn(transTime)
            }
          } else {
            var pDivTemp2 = $('<div></div>')
            pDivTemp2
              .addClass('character-pic')
              .css('margin-left', positionLeft[position] + '%')
              .css('opacity', opacityTemp)
              .css('background', url)
            $('.character-' + position).html(pDivTemp2)
          }
        }
      }

      if (!skipKey || !loadKey2) {
        nextAction(gotoScene, gotoAction, skipKey)
      }
      break

    case 'hide':
      lastEventNode = gotoAction
      $('.character-' + act.getAttribute('position')).html('')
      if (!skipKey || !loadKey2) {
        nextAction(gotoScene, gotoAction, skipKey)
      }
      break

    case 'end':
      lastEventNode = gotoAction
      dialogAutoplay('stop') // Принудительно прекратить автовоспроизведение
      post_achievement_in_event(act)
      if (act.getAttribute('last')) {
        endGame(-1)
      } else endGame(1)
      break

    case 'goto':
      lastEventNode = 0
      gotoA(act.getAttribute('goto'), act.getAttribute('change'), skipKey)
      break

    case 'sound':
      lastEventNode = gotoAction
      if (skipKey || autoSpeed == 'skip') {
        // Пропускать звуковые эффекты в истории при загрузке или перемотке
        return
      }
      var sound = $('#sound')[0]
      $('#sound').attr(
        'src',
       'ru-RU/resources/sounds/' + act.getAttribute('src')
      )
      if (!isNaN(sound.duration)) sound.currentTime = 0
      sound.play()

      nextAction(gotoScene, gotoAction)
      break

    case 'bgm':
      lastEventNode = gotoAction
      var bgm = $('#bgm')[0]
      if (act.getAttribute('status') == 'start') {
        $('#bgm').attr(
          'src',
          'ru-RU/resources/sounds/' + act.getAttribute('src')
        )
        if (!isNaN(bgm.duration)) bgm.currentTime = 0
        bgm.play()
      } else if (act.getAttribute('status') == 'continue') {
        if (bgm.paused) {
          $('#bgm').attr(
            'src',
           'ru-RU/resources/sounds/' + act.getAttribute('src')
          )
          if (!isNaN(bgm.duration)) bgm.currentTime = 0
          bgm.play()
        }
      } else {
        bgm.pause()
        if (!isNaN(bgm.duration)) bgm.currentTime = 0
      }

      if (!skipKey || !loadKey2) {
        nextAction(gotoScene, gotoAction, skipKey)
      }
      break

    default:
      if (!skipKey || !loadKey2) {
        nextAction(gotoScene, gotoAction, skipKey)
      }
  }
}

var thanksWordsFlag = false

function thanksWords() {
  thanksWordsFlag = true
  $('#confirm_1')
    .html(`<div class="submit-center ru"></div>`)
    .css(
      'background',
      "url('" + base_url + "ru-RU/resources/ui/thanks.png') no-repeat"
    )
    .css('background-size', 'auto 100%')
    .css('background-position', 'center')
  $('.submit-center').click(function () {
    $('.submit-center').unbind()
    CloseConfirmDialog()
    endGame()
  })
  $('#confirm').fadeIn()
}

function nextChapterBox() {
  $('#confirm_1')
    .html(
      `<div class="submit-center ru" onclick="CloseConfirmDialog()"></div>`
    )
    .css(
      'background',
      "url('') no-repeat"
    )
    .css('background-size', 'auto 100%')
    .css('background-position', 'center')
  $('#confirm').fadeIn()
}

function gotoA(sceneKey, change, skipKey) {
  var changeColour = '#ffffff'
  var changeTime = 1000
  if (change != null) {
    changeColour = change
    if (
      change.indexOf('none') >= 0 ||
      change.indexOf('None') >= 0 ||
      change.indexOf('NONE') >= 0 ||
      change == '0'
    ) {
      changeColour = null
    }
  }
  if (changeColour) dialogAutoplay('stop') // Принудительно прекратить автовоспроизведение
  $('.white').removeClass().addClass('white').hide() // Отказоустойчивость
  $('.background')
    .css('transition-duration', '0ms')
    .css('transform', 'scale(1,1)')
    .css('transform-origin', 'center')
  if (changeColour) {
    setListens() // Нет ответа на клик в настоящее время
    $('.white')
      .css('background', changeColour)
      .fadeIn(changeTime, function () {
        Action(sceneKey, 0)
        $('.white').fadeOut(changeTime)
      })
  } else {
    if (skipKey) nextAction(sceneKey, -1, skipKey)
    else nextAction(sceneKey, -1)
  }
}

var actionTimer

function nextAction(nowScene, nowAction, nowKey) {
  systemAutoSave() // Автоматическое сохранение
  if (!isdialogAutoplay()) {
    setListens() // Нет ответа на клик в настоящее время
  }
  if (actionTimer) {
    clearTimeout(actionTimer)
    actionTimer = null
  }
  actionTimer = setTimeout(function () {
    Action(Number(nowScene), Number(nowAction) + 1, nowKey)
  }, 1)
}

function RefreshDialog(
  dialog_text,
  gotoScene,
  gotoAction,
  typeLoad,
  textColour
) {
  $('.dialog-text').html(dialog_text)
  $('div.article-pic').css('background-image', function (n, v) {
    return (
      "url('" +
      'ru-RU/resources/background/' +
      $('div.article-pic')[n].getAttribute('picsrc') +
      "')"
    )
  })
  if (checkTextScroll() == null) {
    $('.dialog-overflow_article').addClass('dialog-overflow_article_center') // По центру
  } else {
    $('.dialog-overflow_article').removeClass('dialog-overflow_article_center') // Отменить центрирование
  }
  if (textColour != null) $('.dialog-text').css('color', textColour)
  else $('.dialog-text').css('color', '#ffffff')
  if (typeLoad == 1) {
  } else {
    $('.dialog-text').autotype_text(gotoScene, gotoAction)
  }
}

function ShowDialog(mode, content) {
  var choiceHtml

  if (mode == 1) {
    $('.dialog1').show()
  } else if (mode == 2) {
    $('.choice_list').append('<ul></ul>')

    for (var i = 0; i < content.length; i++) {
      if (content[i]['goto'] == null) {
        choiceHtml = $('<li></li>')
          .text(content[i]['text'])
          .addClass('choice radius shadow')
          .click(
            {
              c1: content[i]['continueScene'],
              c2: content[i]['continueAction'],
              c3: i,
            },
            function (e) {
              historyChoiceList[e.data.c2] = e.data.c3 // Запись выбора, не связанного с переходом
              nextAction(e.data.c1, e.data.c2)
              $('.choice_list').hide()
              $('.choice_list').html('')
            }
          )

        $('.choice_list ul').append(choiceHtml)
      } else {
        if (content[i]['change'] != null) {
          choiceHtml = $('<li></li>')
            .text(content[i]['text'])
            .addClass('choice radius shadow')
            .click(
              { g: content[i]['goto'], c: content[i]['change'] },
              function (e) {
                gotoA(e.data.g, e.data.c)
                $('.choice_list').hide()
                $('.choice_list').html('')
              }
            )

          $('.choice_list ul').append(choiceHtml)
        } else {
          choiceHtml = $('<li></li>')
            .text(content[i]['text'])
            .addClass('choice radius shadow')
            .click({ g: content[i]['goto'] }, function (e) {
              gotoA(e.data.g)
              $('.choice_list').hide()
              $('.choice_list').html('')
            })

          $('.choice_list ul').append(choiceHtml)
        }
      }
    }
    $('.choice_list').show()
  } else if (mode == 3) {
    $('.dialog3').show()
  }
}

function ClearCharas() {
  $('.character-back')
    .css('transition-duration', '')
    .css('transform', '')
    .html('')
  $('.character-mostleft')
    .css('transition-duration', '')
    .css('transform', '')
    .html('')
  $('.character-left')
    .css('transition-duration', '')
    .css('transform', '')
    .html('')
  $('.character-mostright')
    .css('transition-duration', '')
    .css('transform', '')
    .html('')
  $('.character-right')
    .css('transition-duration', '')
    .css('transform', '')
    .html('')
  $('.character-center')
    .css('transition-duration', '')
    .css('transform', '')
    .html('')
  $('.dialog-chara-text').html('')
}

function ClearDialog() {
  $('.dialog-text').html('')
  $('.dialog-chara-text').html('')
  $('.dialog').removeClass('dialog_article')
  $('.dialog-overflow').removeClass('dialog-overflow_article')
}

function ToggleWindow(mode) {
  if (mode == 'menuscene') {
    $('.transition').fadeIn(450, function () {
      var speed = 'normal'
      $('.menuscene').toggle(speed)
      $('.home_btn').toggle(speed)
      $('.buttonBar').toggle(speed, function () {
        $('.transition').fadeOut(450)
      })
    })
  } else if (mode == 'backToMenu') {
    $('.transition').fadeIn(450)
    endGame()
    setTimeout(function() { $(".transition").fadeOut(450); }, 500)
  }
}
/////////////////////////////////

// Автоматическое сохранение----------------------------------------------------------
function systemAutoSave() {
  setCookie(now_galgame_tag, now_galgame)
  setCookie(now_scene_tag, now_scene)
  setCookie(now_action_tag, now_action)
}

function systemAutoLoad() {
  var autoLoadGal = getCookie(now_galgame_tag)
  var autoLoadSce = getCookie(now_scene_tag)
  var autoLoadAct = getCookie(now_action_tag)
  $('.cancel').unbind()
  CloseConfirmDialog()
  startGame(autoLoadGal, { S: autoLoadSce, A: autoLoadAct })
}

function systemAutoLoadStart(galgameKey) {
  var autoLoadGal = getCookie(now_galgame_tag)
  var autoLoadSce = getCookie(now_scene_tag)
  var autoLoadAct = getCookie(now_action_tag)
  if (autoLoadGal != null && autoLoadSce != null && autoLoadAct != null) {
    $('#confirm_1')
      .html(
        `<div class="cancel ru"></div><div class="submit ru" onclick="systemAutoLoad()"></div>`
      )
      .css('background', "url('ru-RU/resources/ui/continue.png') no-repeat")
      .css('background-size', 'auto 100%')
      .css('background-position', 'center')
    $('.cancel').click({ k: galgameKey }, function (e) {
      cancelAutoLoad(e.data.k)
    })
    $('#confirm').fadeIn()
  }
}

function cancelAutoLoad(galgameKey) {
  $('.cancel').unbind()
  CloseConfirmDialog()
  startGame(1, { S: 0, A: 0 })
}

function checkAutoLoad() {
  if (getCookie(now_galgame_tag) != null) {
    if (getCookie(now_scene_tag) != null) {
      if (getCookie(now_action_tag) != null) {
        return true
      }
    }
  }
  return false
}

function startGame(galgameKey, loadKey) {
  var playKey
  autoSpeed = 'stop'
  if (checkAutoLoad() == true && loadKey == null) {
    systemAutoLoadStart(galgameKey)
    return
  }
  startLoad()
  
  var xmlDoc = loadExistXmlFile('catalog_list', function () {
    var doc = xml_files_all_in_this['catalog_list'];
    if (!doc || doc === "FAILED") { LoadFinish(); return; } // Безопасный выход при ошибке
    catalogListTemp = doc.getElementsByTagName('log')
    catalogListLength = catalogListTemp.length
    LoadFinish()
    startGame(galgameKey, loadKey)
  })
  if (!xmlDoc) return
  for (var i = 0; i < catalogListLength; i++) {
    if (getText(catalogListTemp[i]) == galgameKey) {
      playKey = galgameKey // Передаваемый параметр — имя файла
      break
    }
    if (catalogListTemp[i].getAttribute('id') == galgameKey) {
      playKey = getText(catalogListTemp[i]) // Передаваемый параметр — ID
      break
    }
  }
  if (playKey != galgameKey && Number(galgameKey) < 1) {
    i--
    playKey = getText(catalogListTemp[i]) // Недопустимый параметр, чтение последней главы
  } else if (i >= catalogListLength) {
    if (catalogListTemp[Number(galgameKey) - 1] != null) {
      playKey = getText(catalogListTemp[Number(galgameKey) - 1])
      i = Number(galgameKey) - 1
    } else {
      LoadFinish()
      thanksWords()
      return // Глава заканчивается
    }
  }

  // CUSTOM
  let current = getCookie(now_galgame_tag)
  if (!current) {
    playKey = 'ch1'
  }

  galgame(playKey)
  now_galgame = i + 1 // от 1, а не от 0

  // Надежный таймер загрузки
  var countIndexTimer = 0;
  var preLoadImagesTimer = setInterval(function () {
    countIndexTimer++;

    // Если прошло больше 10 секунд (100 * 100ms), принудительно прерываем бесконечное ожидание
    var isTimeout = countIndexTimer > 100;
    
    // Убеждаемся, что сценарий отправлен на загрузку
    var isPlayDocLoading = !xml_files_all_in_this.hasOwnProperty(playKey);
    if (isPlayDocLoading) {
        loadExistXmlFile(playKey, function () {});
        if (!isTimeout) return;
    }

    // Убеждаемся, что база персонажей загрузилась
    var isCharDataEmpty = Object.keys(characterData).length === 0;
    var isCharDocFailed = xml_files_all_in_this['characterData'] === "FAILED";
    
    if (isCharDataEmpty && !isCharDocFailed) {
        if (!isTimeout) return; // Ждём, пока не загрузится или не будет ошибка/таймаут
    }

    if (preLoadImagesCheck() > 0 || isTimeout) {
      clearTimeout(preLoadImagesTimer);
      $('.cg').css('display', 'none');
      $('.transition').fadeIn(300, function () {
        $('.catalog-wrapper').hide();
        $('.catalog-wrapper-new').hide();
        $('.cg-wrapper').hide();
      });
      var bgm = $('#indexbgm')[0];
      bgm.pause(); // главная bgm
      
      // ИСПРАВЛЕНО: безопасный вызов без строк для eval
      setTimeout(function() { $(".menuscene").fadeOut(); }, 350);
      setTimeout(function() { $(".transition").fadeOut(450); }, 450);
      LoadFinish();

      // Если сценарий так и не загрузился, сообщаем об ошибке
      if (xml_files_all_in_this[playKey] === "FAILED") {
          alert("Не удалось загрузить файл сценария: " + playKey + ".xml\nПроверьте, существует ли файл по пути ru-RU/xml/" + playKey + ".xml");
          return;
      }

      if (loadKey == null) {
        Action(0, 0)
      } else if (loadKey.S == 0 && loadKey.A == 0) {
        Action(0, 0)
      } else {
        for (i = 0; i < loadKey.A; i++) {
          Action(loadKey.S, i, 1, 1) // все параметры действия
        }
        Action(loadKey.S, loadKey.A)
      }
    }
  }, 100)
}

function preLoadUiImages(resStr, resList, flag_continue) {
  if (!resStr) return
  if (!resList) return
  if (!resList.length) return
  if (flag_continue != 'continue') $('.preload').html('')
  for (var i = 0; i < resList.length; i++) {
    var $tempImage = $('<img></img>')
    var tempSrc = base_url + 'ru-RU/resources/' + resStr + '/' + resList[i]
    $tempImage
      .attr('src', tempSrc)
      .addClass('preload-image')
      .data('retryCount', 0)
      .bind('error', function () {
        var count = $(this).data('retryCount')
        if (count < 5) {
          // Количество попыток
          $(this).data('retryCount', count + 1)
          this.src = this.src
        }
      })
    $('.preload').append($tempImage)
  }
}

function preLoadImagesBegin(imageList) {
  showInSceneList = new Array() // Очистить кэш-список изображений
  bgInSceneList = new Array()
  cgInSceneList = new Array()
  var charaDefErrorList = new Array()
  for (i in sceneList) {
    var thisScene = sceneList[i] // Список сцен прочитан в процессе
    var thisBgFileName = thisScene.getAttribute('background')
    if (thisBgFileName.length) {
      if (
        $.inArray(thisBgFileName, bgInSceneList) < 0 &&
        $.inArray('.', thisBgFileName) > 0
      ) {
        bgInSceneList.push(thisBgFileName)
      }
    }
    for (var j in thisScene.childNodes) {
      var thisEvent = thisScene.childNodes[j]
      if (thisEvent.tagName == 'show') {
        var chara = thisEvent.getAttribute('chara')
        if (chara) {
          if (characterData[chara]) {
            if ($.inArray(characterData[chara]['src'], showInSceneList) < 0) {
              showInSceneList.push(characterData[chara]['src']) // Храните только действительно использованные и задекларированные изображения
            }
          } else if (!charaDefErrorList[chara]) {
            console.log('Defination Error: ' + chara)
            charaDefErrorList[chara] = 1
          }
        }
      } else if (thisEvent.tagName == 'speak') {
        var chara = thisEvent.getAttribute('chara')
        if (chara) {
          if (!characterData[chara] && !charaDefErrorList[chara]) {
            console.log('Defination Error: ' + chara)
            charaDefErrorList[chara] = 1
          }
        }
      } else if (thisEvent.tagName == 'cg') {
        var thisCgFileName = thisEvent.getAttribute('src')
        var thisBgFileName = thisEvent.getAttribute('bg')
        if (thisBgFileName) {
          if (thisBgFileName.length) {
            if ($.inArray(thisBgFileName, bgInSceneList) < 0) {
              bgInSceneList.push(thisBgFileName)
            }
          }
        }
        if (thisCgFileName) {
          if (thisCgFileName.length) {
            if ($.inArray(thisCgFileName, cgInSceneList) < 0) {
              cgInSceneList.push(thisCgFileName)
            }
          }
        }
      }
    }
  }
  preLoadUiImages('chara', showInSceneList)
  preLoadUiImages('background', bgInSceneList, 'continue')
  preLoadUiImages('cg', cgInSceneList, 'continue')
  var i_max = -1
  if (imageList) i_max = imageList.length
  for (var i = 0; i < i_max; i++) {
    if (imageList[i].getAttribute('type') == 'chara') continue
    else if (imageList[i].getAttribute('type') == 'cg') continue
    else if (imageList[i].getAttribute('type') == 'background') continue
    var $tempImage = $('<img></img>')
    var tempSrc =
      base_url +
      'ru-RU/resources/' +
      imageList[i].getAttribute('type') +
      '/' +
      imageList[i].getAttribute('src')
    if (imageList[i].getAttribute('type') == 'www')
      tempSrc = imageList[i].getAttribute('src')
    $tempImage
      .attr('src', tempSrc)
      .addClass('preload-image')
      .data('retryCount', 0)
      .bind('error', function () {
        var count = $(this).data('retryCount')
        if (count < 5) {
          // Количество попыток
          $(this).data('retryCount', count + 1)
          this.src = this.src
        }
      })
    $('.preload').append($tempImage)
  }
  $tempImage = $('<img></img>')
  tempSrc = ''
  $tempImage
    .attr('src', tempSrc)
    .addClass('preload-image')
    .data('retryCount', 0)
    .bind('error', function () {
      var count = $(this).data('retryCount')
      if (count < 5) {
        // Количество попыток
        $(this).data('retryCount', count + 1)
        this.src = this.src
      }
    })
  $('.preload').append($tempImage)
}

function preLoadImagesCheck(imageClassName) {
  var checkAnswer = 1
  if (!imageClassName) imageClassName = 'preload-image'
  $('.' + imageClassName).each(function () {
    if (this.complete) {
      checkAnswer *= 1
    } else {
      checkAnswer *= 0
    }
  })
  return checkAnswer
}

function endGame(keyFlag) {
  autoSpeed = 'stop'
  if (keyFlag == null) {
    setListens()
    var bgm = $('#bgm')[0]
    bgm.pause()
    if (!isNaN(bgm.duration)) bgm.currentTime = 0
    var sound = $('#sound')[0]
    sound.pause()
    if (!isNaN(sound.duration)) sound.currentTime = 0 // остановить bgm se
    $('.menuscene').fadeIn(500, function () {
      $('.cg').css('display', 'none')
      bgm = $('#indexbgm')[0]
      if (!isNaN(bgm.duration)) bgm.currentTime = 0
      bgm.play() // главная bgm
      LoadFinish()
      if (thanksWordsFlag) {
        nextChapterBox()
        thanksWordsFlag = false
      }
    })
  } else if (keyFlag < 0) {
    setListens()
    var bgm = $('#bgm')[0]
    bgm.pause()
    if (!isNaN(bgm.duration)) bgm.currentTime = 0
    var sound = $('#sound')[0]
    sound.pause()
    if (!isNaN(sound.duration)) sound.currentTime = 0 // остановить bgm se
    $('.menuscene').fadeIn(500, function () {
      $('.cg').css('display', 'none')
      bgm = $('#indexbgm')[0]
      if (!isNaN(bgm.duration)) bgm.currentTime = 0
      bgm.play() // главная bgm
      LoadFinish()
      nextChapterBox()
    })
  } else {
    startGame(now_galgame + 1, { S: 0, A: 0 })
  }
}

function HideUi() {
  $('.buttonBar').hide()
  $('.home_btn').hide()
  $('.dialog').hide()
  $('.dialog-chara').hide()
}

function ShowUi(dialog, chara) {
  $('.buttonBar').show()
  $('.home_btn').show()
  if (arguments[0] == null) dialog = 0
  if (arguments[1] == null) chara = 0
  if (dialog > 0) $('.dialog').show()
  if (chara > 0) $('.dialog-chara').show()
}

function ToggleCloseButton(close_obj) {
  // Изменилась ли функция?
  var close_btn_data = $('.close_btn').attr('data')
  if (close_btn_data) {
    $('.close_btn').toggle()
    $('.close_btn').attr('data', '')
    $('.' + close_btn_data).hide()
  } else {
    $('.close_btn').attr('data', close_obj)
    $('.close_btn').toggle()
  }
}

// Загрузить архив / сохранить архив
function add_record() {
  dialogAutoplay('stop')
  $('#confirm_1').html(
    '<div class="cancel" onclick="CloseConfirmDialog()"></div><div class="submit" onclick="add_record_submit()"></div>'
  )
  $('#confirm_1').css(
    'background',
    "url('ru-RU/resources/ui/quicksave.png') no-repeat"
  )
  $('#confirm_1').css('background-size', 'auto 100%')
  $('#confirm_1').css('background-position', 'center')
  $('#confirm').fadeIn()
}

function get_record() {
  dialogAutoplay('stop')
  $('#confirm_1').html(
    '<div class="cancel" onclick="CloseConfirmDialog()"></div><div class="submit" onclick="get_record_submit()"></div>'
  )
  $('#confirm_1').css(
    'background',
    "url('ru-RU/resources/ui/quickload.png') no-repeat"
  )
  $('#confirm_1').css('background-size', 'auto 100%')
  $('#confirm_1').css('background-position', 'center')
  $('#confirm').fadeIn()
}

function CloseConfirmDialog() {
  $('#confirm').fadeOut()
}

function add_record_submit() {
  setCookie(now_galgame + now_scene_tag, now_scene)
  setCookie(now_galgame + now_action_tag, now_action)
  if (!getCookie(now_galgame + now_scene_tag)) {
    alert(gameTips['save_tips'])
  }
  CloseConfirmDialog()
  return
}

function get_record_submit() {
  autoSpeed = 'stop'
  var bgm = $('#bgm')[0]
  bgm.pause()
  bgm = $('#sound')[0]
  bgm.pause()
  var recordScene = getCookie(now_galgame + now_scene_tag)
  var recordAction = getCookie(now_galgame + now_action_tag)
  CloseConfirmDialog()
  if (recordScene && recordAction) {
    setTimeout(function() { ClearCharas(); }, 450)
    setTimeout(function() { ClearDialog(); }, 450)
    $('.transition').fadeIn(450, function () {
      for (var i = 0; i < recordAction; i++) {
        Action(recordScene, i, 1, 1)
      }
      Action(recordScene, recordAction, 1)
    })
    setTimeout(function() { $(".menuscene").fadeOut(); }, 450)
    setTimeout(function() { $(".transition").fadeOut(450); }, 500)
    setListens(recordScene, recordAction)
  } else {
    alert(gameTips['empty_save_tips'])
  }
  return
}

function showCgOrigin(str) {
  $('.showCgOrigin').css(
    'background-image',
    "url('" + 'ru-RU/resources/cg/' + str + "')"
  )
  $('.showCgOrigin').fadeIn()
}

$('.showCgOrigin').click(function () {
  $('.showCgOrigin').fadeOut()
})

function browserRedirect() {
  var sUserAgent = navigator.userAgent.toLowerCase()
  var bIsIpad = sUserAgent.match(/ipad/i) == 'ipad'
  var bIsIphoneOs = sUserAgent.match(/iphone os/i) == 'iphone os'
  var bIsMidp = sUserAgent.match(/midp/i) == 'midp'
  var bIsUc7 = sUserAgent.match(/rv:1.2.3.4/i) == 'rv:1.2.3.4'
  var bIsUc = sUserAgent.match(/ucweb/i) == 'ucweb'
  var bIsAndroid = sUserAgent.match(/android/i) == 'android'
  var bIsCE = sUserAgent.match(/windows ce/i) == 'windows ce'
  var bIsWM = sUserAgent.match(/windows mobile/i) == 'windows mobile'
  if (
    bIsIpad ||
    bIsIphoneOs ||
    bIsMidp ||
    bIsUc7 ||
    bIsUc ||
    bIsAndroid ||
    bIsCE ||
    bIsWM
  ) {
    return 'phone'
  } else {
    return 'pc'
  }
}

function check_size() {
  var winWidth
  var winHeight
  // Получить ширину окна
  if (window.innerWidth) {
    winWidth = window.innerWidth
  } else if (document.body && document.body.clientWidth) {
    winWidth = document.body.clientWidth // Получить высоту окна
  }
  winWidth = parseInt(winWidth)
  if (window.innerHeight) {
    winHeight = window.innerHeight
  } else if (document.body && document.body.clientHeight) {
    winHeight = document.body.clientHeight
  }
  winHeight = parseInt(winHeight)
  // Получение размера окна путем глубокой проверки тела внутри Document
  if (
    document.documentElement &&
    document.documentElement.clientHeight &&
    document.documentElement.clientWidth
  ) {
    winHeight = document.documentElement.clientHeight
    winWidth = document.documentElement.clientWidth
  }
  $('html').css(
    'font-size',
    $(window).width() / $(window).height() > 16 / 9
      ? ($(window).height() / ((9 / 16) * $(window).width())) *
          (($(window).width() / 736) * 16.1) +
          'px'
      : ($(window).width() / 736) * 16.1 + 'px'
  )
  $('.bottom').css('display', 'none')
  $('.black').css('display', '')
  if (winWidth / winHeight > 16 / 9) {
    $('.frame')
      .css('height', winHeight + 1 + 'px')
      .css('width', (winHeight / 9) * 16 + 'px')
    $('.black-t').css('width', (winWidth - $('.frame').width()) / 2 + 'px')
  } else {
    $('.frame')
      .css('width', winWidth + 'px')
      .css('height', (winWidth / 16) * 9 + 1 + 'px')
  }
  $('.frame')
    .css('left', ($('.black').width() - $('.frame').width()) / 2 + 'px')
    .css('top', ($('.black').height() - $('.frame').height()) / 2 + 'px')

  window.scrollTo(0, 1) // Скрытие панели инструментов браузера
}

// CUSTOM: запрашивает XML по настраиваемому пользователем xmlPath, в случае неудачи он вернется к основному репо VN
function get_xml_ajax_async(
  xmlName,
  callBack,
  fileType,
  xmlFileURL,
  first = true
) {
  if (!xmlFileURL) {
    if (fileType) {
      xmlFileURL = xmlPath + xmlName + '.' + fileType
    } else {
      xmlFileURL = xmlPath + xmlName + '.xml?sid=' + Math.random()
    }
  }
  $.ajax({
    type: 'GET',
    url: xmlFileURL,
    dataType: 'xml',
    success: function (result) {
      xml_files_all_in_this[xmlName] = result
      callBack()
    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      if (first) {
        get_xml_ajax_async(
          xmlName,
          callBack,
          fileType,
          xmlFileURL,
          false
        )
      } else {
        console.error("Не удалось загрузить XML файл:", xmlFileURL);
        xml_files_all_in_this[xmlName] = "FAILED"; // ИСПРАВЛЕНО: предотвращение бесконечного цикла, если файла нет
        callBack()
      }
    },
  })
}

function loadExistXmlFile(xmlName, callBack, fileType) {
  if (xml_files_all_in_this.hasOwnProperty(xmlName)) {
    if (xml_files_all_in_this[xmlName] === "FAILED") return null; // ИСПРАВЛЕНО: немедленная остановка при ошибке
    return xml_files_all_in_this[xmlName]
  } else if (loading_xml_files.hasOwnProperty(xmlName)) {
    return null // Исключить непредвиденный параллелизм
  } else {
    loading_xml_files[xmlName] = true
    get_xml_ajax_async(
      xmlName,
      function () {
        delete loading_xml_files[xmlName]
        callBack()
      },
      fileType
    )
    return null
  }
}

function getText(e) {
  var t = ''
  if (!e) return null
  e = e.childNodes || e // Если передан элемент, то продолжаем обход его дочерних элементов; в противном случае предполагаем, что это массив
  for (var i = 0; i < e.length; i++) {
    // Если это не элемент, то возвращаем его текстовое значение;
    // в противном случае рекурсивно проходим по всем дочерним узлам элемента;
    if (e[i].nodeType) {
      t += e[i].nodeType != 1 ? e[i].nodeValue : getText(e[i].childNodes)
    } else {
      t += e[i] // Случай со строкой
    }
  }
  return t
}

function base64Encode(input) {
  var rv
  rv = encodeURIComponent(input)
  rv = unescape(rv)
  rv = window.btoa(rv)
  return rv
}

function base64Decode(input) {
  rv = window.atob(input)
  rv = escape(rv)
  rv = decodeURIComponent(rv)
  return rv
}

//-------------------------------------------------------
// Интерфейс оглавления
var catalogPageIndex = 0
var catalogListLength = 0
var catalogListTemp = null

function catalogPageNew(page, flag) {
  var i
  var j
  startLoad()
  $('.grid_layout').hide()
  if (!page) {
    page = catalogPageIndex
  }
  var xmlDoc = loadExistXmlFile('catalog_list', function () {
    var doc = xml_files_all_in_this['catalog_list'];
    if (!doc || doc === "FAILED") { LoadFinish(); return; } // ИСПРАВЛЕНО
    catalogListTemp = doc.getElementsByTagName('log')
    catalogListLength = catalogListTemp.length
    catalogPageNew(page, flag)
  })
  if (!xmlDoc) return
  if (catalogPageIndex == 0) {
    $('.pagenum#pagenum-7').addClass('pagenum-gray')
  }
  if ((catalogPageIndex + 1) * 2 >= catalogListLength) {
    $('.pagenum#pagenum-8').addClass('pagenum-gray')
  }
  var catalogListSort = new Array()
  for (i = 0; catalogListTemp[i] != null; i++) {
    j = catalogListTemp[i].getAttribute('id')
    catalogListSort[Number(j)] = catalogListTemp[i]
  }
  for (i = page * 2; i < (page + 1) * 2; i++) {
    $('#catalog-content-' + (i - page * 2)).hide()
  }
  j = 0
  var flag_background = true
  for (i in catalogListSort) {
    if (j >= page * 2 && j < (page + 1) * 2) {
      if (catalogListSort[i].getAttribute('picOne') && flag_background) {
        flag_background = false
        $('.catalog-wrapper-new').css(
          'background-image',
          "url('" +
          'ru-RU/resources/background/' +
            catalogListSort[i].getAttribute('picOne') +
            ".jpg')"
        )
      }
      $('#catalog-chap-' + (j - page * 2)).css(
        'background-image',
        "url('" +
          'ru-RU/resources/catalog/t' +
          getText(catalogListSort[i]) +
          ".png')"
      );
      $('#catalog-content-' + (j - page * 2))
        .removeClass('catalog-content-1A')
        .removeClass('catalog-content-2Ab')
        .removeClass('catalog-content-3Abc')
        .removeClass('catalog-content-2Ba')
        .removeClass('catalog-content-3Bac')
        .removeClass('catalog-content-3Cab')
      $('#catalog-label_1-' + (j - page * 2))
        .removeClass('catalog-label_1_on')
        .removeClass('catalog-label_1_off')
        .unbind()
      $('#catalog-label_2-' + (j - page * 2))
        .removeClass('catalog-label_2_on')
        .removeClass('catalog-label_2_off')
        .unbind()
      $('#catalog-label_3-' + (j - page * 2))
        .removeClass('catalog-label_3_on')
        .removeClass('catalog-label_3_off')
        .unbind()
      $('#article-frame-' + (j - page * 2)).html(
        '<p style="color:#ffffff;text-align:left;">' +
          catalogListSort[i].getAttribute('quotationOne') +
          '</p>'
      )
      if (!catalogListSort[i].getAttribute('partThree')) {
        if (!catalogListSort[i].getAttribute('partTwo')) {
          $('#catalog-content-' + (j - page * 2)).addClass('catalog-content-1A')
          $('#catalog-label_1-' + (j - page * 2)).addClass('catalog-label_1_on')
          $('#catalog-go-' + (j - page * 2))
            .unbind()
            .click(
              {
                str: catalogListSort[i].getAttribute('id'),
                sce: catalogListSort[i].getAttribute('partOne'),
              },
              function (ee) {
                startGame(ee.data.str, { S: ee.data.sce, A: 0 })
              }
            )
        } else {
          $('#catalog-content-' + (j - page * 2)).addClass(
            'catalog-content-2Ab'
          )
          $('#catalog-label_1-' + (j - page * 2))
            .addClass('catalog-label_1_on')
            .click(
              {
                pic: catalogListSort[i].getAttribute('picOne'),
                quo: catalogListSort[i].getAttribute('quotationOne'),
                str: catalogListSort[i].getAttribute('id'),
                sc1: catalogListSort[i].getAttribute('partOne'),
                sc2: catalogListSort[i].getAttribute('partTwo'),
                sc3: catalogListSort[i].getAttribute('partThree'),
                pos: j - page * 2,
              },
              function (e) {
                $('.catalog-wrapper-new').css(
                  'background-image',
                  "url('" +
                   'ru-RU/resources/background/' +
                    e.data.pic +
                    ".jpg')"
                )
                $('#article-frame-' + e.data.pos).html(
                  '<p style="color:#ffffff;text-align:left;">' +
                    e.data.quo +
                    '</p>'
                )
                $('#catalog-content-' + e.data.pos)
                  .removeClass('catalog-content-2Ba')
                  .addClass('catalog-content-2Ab')
                $('#catalog-label_1-' + e.data.pos)
                  .removeClass('catalog-label_1_off')
                  .addClass('catalog-label_1_on')
                $('#catalog-go-' + e.data.pos)
                  .unbind()
                  .click({ str: e.data.str, sce: e.data.sc1 }, function (ee) {
                    startGame(ee.data.str, { S: ee.data.sce, A: 0 })
                  })
              }
            )
          $('#catalog-label_2-' + (j - page * 2))
            .addClass('catalog-label_2_off')
            .click(
              {
                pic: catalogListSort[i].getAttribute('picTwo'),
                quo: catalogListSort[i].getAttribute('quotationTwo'),
                str: catalogListSort[i].getAttribute('id'),
                sc1: catalogListSort[i].getAttribute('partOne'),
                sc2: catalogListSort[i].getAttribute('partTwo'),
                sc3: catalogListSort[i].getAttribute('partThree'),
                pos: j - page * 2,
              },
              function (e) {
                $('.catalog-wrapper-new').css(
                  'background-image',
                  "url('" +
                  'ru-RU/resources/background/' +
                    e.data.pic +
                    ".jpg')"
                )
                $('#article-frame-' + e.data.pos).html(
                  '<p style="color:#ffffff;text-align:left;">' +
                    e.data.quo +
                    '</p>'
                )
                $('#catalog-content-' + e.data.pos)
                  .removeClass('catalog-content-2Ab')
                  .addClass('catalog-content-2Ba')
                $('#catalog-label_2-' + e.data.pos)
                  .removeClass('catalog-label_2_off')
                  .addClass('catalog-label_2_on')
                $('#catalog-go-' + e.data.pos)
                  .unbind()
                  .click({ str: e.data.str, sce: e.data.sc2 }, function (ee) {
                    startGame(ee.data.str, { S: ee.data.sce, A: 0 })
                  })
              }
            )
          $('#catalog-go-' + (j - page * 2))
            .unbind()
            .click(
              {
                str: catalogListSort[i].getAttribute('id'),
                sce: catalogListSort[i].getAttribute('partOne'),
              },
              function (ee) {
                startGame(ee.data.str, { S: ee.data.sce, A: 0 })
              }
            )
        }
      } else {
        $('#catalog-content-' + (j - page * 2)).addClass('catalog-content-3Abc')
        $('#catalog-label_1-' + (j - page * 2))
          .addClass('catalog-label_1_on')
          .click(
            {
              pic: catalogListSort[i].getAttribute('picOne'),
              quo: catalogListSort[i].getAttribute('quotationOne'),
              str: catalogListSort[i].getAttribute('id'),
              sc1: catalogListSort[i].getAttribute('partOne'),
              sc2: catalogListSort[i].getAttribute('partTwo'),
              sc3: catalogListSort[i].getAttribute('partThree'),
              pos: j - page * 2,
            },
            function (e) {
              $('.catalog-wrapper-new').css(
                'background-image',
                "url('" +
                'ru-RU/resources/background/' +
                  e.data.pic +
                  ".jpg')"
              )
              $('#article-frame-' + e.data.pos).html(
                '<p style="color:#ffffff;text-align:left;">' +
                  e.data.quo +
                  '</p>'
              )
              $('#catalog-content-' + e.data.pos)
                .removeClass('catalog-content-3Bac')
                .removeClass('catalog-content-3Cab')
                .addClass('catalog-content-3Abc')
              $('#catalog-label_1-' + e.data.pos)
                .removeClass('catalog-label_1_off')
                .addClass('catalog-label_1_on')
              $('#catalog-go-' + e.data.pos)
                .unbind()
                .click({ str: e.data.str, sce: e.data.sc1 }, function (ee) {
                  startGame(ee.data.str, { S: ee.data.sce, A: 0 })
                })
            }
          )
        $('#catalog-label_2-' + (j - page * 2))
          .addClass('catalog-label_2_off')
          .click(
            {
              pic: catalogListSort[i].getAttribute('picTwo'),
              quo: catalogListSort[i].getAttribute('quotationTwo'),
              str: catalogListSort[i].getAttribute('id'),
              sc1: catalogListSort[i].getAttribute('partOne'),
              sc2: catalogListSort[i].getAttribute('partTwo'),
              sc3: catalogListSort[i].getAttribute('partThree'),
              pos: j - page * 2,
            },
            function (e) {
              $('.catalog-wrapper-new').css(
                'background-image',
                "url('" +
                'ru-RU/resources/background/' +
                  e.data.pic +
                  ".jpg')"
              )
              $('#article-frame-' + e.data.pos).html(
                '<p style="color:#ffffff;text-align:left;">' +
                  e.data.quo +
                  '</p>'
              )
              $('#catalog-content-' + e.data.pos)
                .removeClass('catalog-content-3Abc')
                .removeClass('catalog-content-3Cab')
                .addClass('catalog-content-3Bac')
              $('#catalog-label_2-' + e.data.pos)
                .removeClass('catalog-label_2_off')
                .addClass('catalog-label_2_on')
              $('#catalog-go-' + e.data.pos)
                .unbind()
                .click({ str: e.data.str, sce: e.data.sc2 }, function (ee) {
                  startGame(ee.data.str, { S: ee.data.sce, A: 0 })
                })
            }
          )
        $('#catalog-label_3-' + (j - page * 2))
          .addClass('catalog-label_3_off')
          .click(
            {
              pic: catalogListSort[i].getAttribute('picThree'),
              quo: catalogListSort[i].getAttribute('quotationThree'),
              str: catalogListSort[i].getAttribute('id'),
              sc1: catalogListSort[i].getAttribute('partOne'),
              sc2: catalogListSort[i].getAttribute('partTwo'),
              sc3: catalogListSort[i].getAttribute('partThree'),
              pos: j - page * 2,
            },
            function (e) {
              $('.catalog-wrapper-new').css(
                'background-image',
                "url('" +
                'ru-RU/resources/background/' +
                  e.data.pic +
                  ".jpg')"
              )
              $('#article-frame-' + e.data.pos).html(
                '<p style="color:#ffffff;text-align:left;">' +
                  e.data.quo +
                  '</p>'
              )
              $('#catalog-content-' + e.data.pos)
                .removeClass('catalog-content-3Abc')
                .removeClass('catalog-content-3Bac')
                .addClass('catalog-content-3Cab')
              $('#catalog-label_3-' + e.data.pos)
                .removeClass('catalog-label_3_off')
                .addClass('catalog-label_3_on')
              $('#catalog-go-' + e.data.pos)
                .unbind()
                .click({ str: e.data.str, sce: e.data.sc3 }, function (ee) {
                  startGame(ee.data.str, { S: ee.data.sce, A: 0 })
                })
            }
          )
        $('#catalog-go-' + (j - page * 2))
          .unbind()
          .click(
            {
              str: catalogListSort[i].getAttribute('id'),
              sce: catalogListSort[i].getAttribute('partOne'),
            },
            function (ee) {
              startGame(ee.data.str, { S: ee.data.sce, A: 0 })
            }
          )
      }
      $('#catalog-content-' + (j - page * 2)).show()
    } else if (j >= (page + 1) * 2) {
      break
    }
    j++
  }
  if (flag == null) $('.catalog-wrapper-new').fadeIn()
  catalogListSort = null
  LoadFinish()
}

$('.pagenum#pagenum-7').click(function () {
  if (catalogPageIndex > 0) {
    if ((catalogPageIndex + 1) * 2 >= catalogListLength) {
      $('.pagenum#pagenum-8').removeClass('pagenum-gray')
    }
    catalogPageIndex--
    showCatalogFrame(catalogPageIndex)
    if (catalogPageIndex == 2) {
      $('.pagenum#pagenum-7').addClass('pagenum-gray')
    }
  }
}) // Назад

$('.pagenum#pagenum-8').click(function () {
  if ((catalogPageIndex + 1) * 2 < catalogListLength) {
    if (catalogPageIndex == 0) {
      $('.pagenum#pagenum-7').removeClass('pagenum-gray')
    }
    catalogPageIndex++
    showCatalogFrame(catalogPageIndex)
    if ((catalogPageIndex + 1) * 2 >= catalogListLength) {
      $('.pagenum#pagenum-8').addClass('pagenum-gray')
    }
  }
}) // Вперед

function showCatalogFrame(page) {
  // Новое
  catalogPageNew(page)
}
//-------------------------------------------------------

function setCookie(name, value) {
  localStorage.setItem(name, value)
}

/// Удалить cookie
function delCookie(name) {
  localStorage.removeItem(name)
}

// Прочитать cookie
function getCookie(name) {
  return localStorage.getItem(name)
}

function GetQueryString(_name) {
  var reg = new RegExp('(^|&)' + _name + '=([^&]*)(&|$)')
  var r = window.location.search.substr(1).match(reg)
  if (r != null) return unescape(r[2])
  return null
}

// Связано с историей------------------------------------------------------
$('.dialog-btn-history').click(function (e) {
  e.stopPropagation()
  showHistory()
})

$('.home_btn').click(function () {
  if ($('.home_btn').hasClass('home_btn_history')) {
    hideHistory()
  } else if ($('.home_btn').hasClass('home_btn_remark')) {
    hideremark()
  } else {
    dialogAutoplay('stop')
    systemAutoSave()
    ToggleWindow('backToMenu')
  }
})

$('.history').hide()
var remarkFlag_History = false

function showHistory() {
  var thisScene = sceneList[now_scene]
  var thisEvent
  var pHtml, pHtml2
  var choiceList
  var historyTextBox
  var choiceKey
  dialogAutoplay('stop')
  $('.dialog').hide()
  $('.dialog-btn').hide()
  $('.choice').hide()
  $('.history').show()
  if ($('.remark_btn').css('opacity') == '1') {
    remark_btn_hide()
    remarkFlag_History = true
  }
  setListens()
  $('.home_btn').addClass('home_btn_history')
  historyTextBox = $('div#historyTextBox.history-text')
  historyTextBox.html('')

  for (var i = 0; i <= now_action; i++) {
    thisEvent = thisScene.childNodes[i]
    if (thisEvent != null) {
      pHtml = null
      pHtml2 = null
      if (thisEvent.nodeName == 'text') {
        var tempAttribute = thisEvent.getAttribute('article')
        pHtml = $('<p></p>')
        if (tempAttribute == null) {
          pHtml.html(getText(thisEvent))
        } else if (
          tempAttribute == '1' ||
          tempAttribute.indexOf('true') >= 0 ||
          tempAttribute.indexOf('True') >= 0 ||
          tempAttribute.indexOf('TRUE') >= 0
        ) {
          pHtml = $('<div></div>')
          pHtml.html(thisEvent.innerHTML)
        } else {
          pHtml.html(getText(thisEvent))
        }
        pHtml.addClass('history-text')
        historyTextBox.append(pHtml)
      } else if (thisEvent.nodeName == 'speak') {
        pHtml = $('<p></p>')
        pHtml
          .html(characterData[thisEvent.getAttribute('chara')]['name'] + ':')
          .addClass('history-text')
        historyTextBox.append(pHtml)
        pHtml = $('<p></p>')
        pHtml.html(getText(thisEvent)).addClass('history-text')
        historyTextBox.append(pHtml)
      } else if (thisEvent.nodeName == 'choices') {
        choiceList = thisEvent.childNodes
        pHtml = $('<ul></ul>')
        choiceKey = 0
        for (j = 0; j < choiceList.length; j++) {
          if (choiceList[j].nodeName != '#text') {
            pHtml2 = $('<li></li>')
            pHtml2.html(getText(choiceList[j])).addClass('history-choice')
            if (historyChoiceList[i] == choiceKey) {
              pHtml2.addClass('history-choice-mark')
            }
            pHtml.append(pHtml2)
            choiceKey++
          }
        }
        historyTextBox.append(pHtml)
      }
      if (pHtml != null && i < now_action) {
        historyTextBox.append('<br />')
      }
    }
  }
  historyTextBox.children().addClass('history-text')

  var scrollIndex =
    $('.history-overflow')[0].scrollHeight - $('.history-overflow').height()
  $('.history-overflow').scrollTop(scrollIndex)
}

function hideHistory() {
  $('div#historyTextBox.history-text').html('')
  $('.history').hide()
  $('.dialog').show()
  $('.dialog-btn').show()
  $('.choice').show()
  $('.home_btn').removeClass('home_btn_history')
  if (remarkFlag_History) {
    remark_btn_show()
    remarkFlag_History = false
  }
  setListens(now_scene, now_action)
}
//----------------------------------------------------------------

// Связано с системой текстовых примечаний------------------------------------------------
$('.remark').hide()
remark_btn_hide()

function remark_btn_hide() {
  $('.remark_btn')
    .unbind()
    .click(function (e) {
      e.stopPropagation()
    })
    .css('opacity', '0')
    .css('cursor', 'default')
}

function remark_btn_show() {
  $('.remark_btn')
    .unbind()
    .click(function (e) {
      e.stopPropagation()
      showremark()
    })
    .css('opacity', '1')
    .css('cursor', 'pointer')
}

function post_achievement_in_event(eventNode) {
  if (eventNode.getAttribute('post')) {
    post_achievement(eventNode.getAttribute('post'))
  }
}

function showremark() {
  var i
  dialogAutoplay('stop')
  $('.dialog').hide()
  $('.dialog-btn').hide()
  $('.choice').hide()
  $('.remark').show()
  remark_btn_hide()
  setListens()
  $('.home_btn').addClass('home_btn_remark')
  var remarkScene = sceneList[now_scene]
  var remarkTextBox = $('div#remarkTextBox.remark-text')
  remarkTextBox.html('')
  for (i = now_action; i < remarkScene.childNodes.length; i++) {
    var remarkEvent = remarkScene.childNodes[i]
    if (remarkEvent.nodeName == 'remark') {
      remarkTextBox.html(remarkEvent.innerHTML)
      post_achievement_in_event(remarkEvent)
      break
    }
  }
  $('div.article-pic').css('background-image', function (n, v) {
    return (
      "url('" +
      'ru-RU/resources/background/' +
      $('div.article-pic')[n].getAttribute('picsrc') +
      "')"
    )
  })
  remarkTextBox.children().addClass('history-text')
  $('.remark-overflow').scrollTop(0)
}

function hideremark() {
  $('div#remarkTextBox.remark-text').html('')
  $('.remark').hide()
  remark_btn_show()
  $('.dialog').show()
  $('.dialog-btn').show()
  $('.choice').show()
  $('.home_btn').removeClass('home_btn_remark')
  setListens(now_scene, now_action)
}
//---------------------------------------------------------------

function wrk_get_size() {
  var winWidth
  var winHeight

  if (window.innerWidth) winWidth = window.innerWidth
  else if (document.body && document.body.clientWidth)
    winWidth = document.body.clientWidth
  // Получить высоту окна
  if (window.innerHeight) winHeight = window.innerHeight
  else if (document.body && document.body.clientHeight)
    winHeight = document.body.clientHeight
  // Получение размера окна путем глубокой проверки тела внутри Document
  if (
    document.documentElement &&
    document.documentElement.clientHeight &&
    document.documentElement.clientWidth
  ) {
    winHeight = document.documentElement.clientHeight
    winWidth = document.documentElement.clientWidth
  }
  return { winWidth: winWidth, winHeight: winHeight }
}

function wrk_check_size() {
  var win = wrk_get_size()

  if (win.winWidth < win.winHeight) {
    $('.wrk').show()
    return false
  } else {
    $('.wrk').hide()
    return true
  }
}
wrk_check_size()
//wrk_check_size----------------------------------------

var achievementQueryString = ''
if (GetQueryString('auth_key')) {
  if (GetQueryString('sign')) {
    achievementQueryString =
      '?auth_key=' +
      GetQueryString('auth_key') +
      '&sign=' +
      GetQueryString('sign')
  }
}

//Достижения-------------------------------------------
var ajax_answer_achievement = null;

// Статичная база данных всех возможных достижений из achievement.php
var masterAchievementData = [
  {"achievement":10010,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e00\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10011,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u795e\u66f2\u300b\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10012,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u7684\u91cc\u96c5\u65af\u7279\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10013,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u9b54\u6212\u300b\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10020,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10021,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5e1d\u56fd\u7814\u7a76\u9662\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10022,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u7ef4\u591a\u5229\u4e9a\u4e0e\u963f\u5c14\u4f2f\u7279\u535a\u7269\u9986\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10030,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e09\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10031,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u5c24\u5229\u897f\u65af\u300b\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10032,"text":"\u4f60\u9009\u62e9\u4e86\u67d0\u4e2a\u5206\u652f\u9009\u9879\u3002","image":"ein"},
  {"achievement":10033,"text":"\u4f60\u9009\u62e9\u4e86\u67d0\u4e2a\u5206\u652f\u9009\u9879\u3002","image":"welt"},
  {"achievement":10040,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u56db\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10041,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u4ea8\u5f17\u83b1\u00b7\u9c8d\u5609\u7684\u6ce8\u91ca\u3002","image":"nokia"},
  {"achievement":10042,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u4f0a\u5a03\u7684\u6ce2\u5c14\u5361\u300b\u7684\u6ce8\u91ca\u3002","image":"nokia"},
  {"achievement":10043,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u522b\u95f9\u4e86\uff0c\u8d39\u66fc\u5148\u751f\u300b\u7684\u6ce8\u91ca\u3002","image":"plank"},
  {"achievement":10050,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e94\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10051,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u672b\u6b21\u51b0\u76db\u671f\u7684\u6ce8\u91ca\u3002","image":"schro"},
  {"achievement":10052,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u4e0d\u786e\u5b9a\u6027\u539f\u7406\u7684\u6ce8\u91ca\u3002","image":"schro"},
  {"achievement":10053,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u8001\u5fe0\u5b9e\u6cc9\u7684\u6ce8\u91ca\u3002","image":"plank"},
  {"achievement":10060,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u516d\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10061,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5e9e\u8d1d\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10062,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u57fa\u7763\u5c71\u4f2f\u7235\u300b\u7684\u6ce8\u91ca\u3002","image":"plank"},
  {"achievement":10063,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u4f26\u8482\u5c3c\u6069\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10070,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e03\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10071,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u7f57\u5fb7\u5c9b\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10072,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u65bd\u6d17\u8005\u7ea6\u7ff0\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10073,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u7eb3\u5c14\u900a\u7684\u540d\u8a00\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10080,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u516b\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10081,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u6d1b\u592b\u83b1\u65af\u4f2f\u7235\u592b\u4eba\u7684\u6ce8\u91ca\u3002","image":"ada"},
  {"achievement":10082,"text":"\u4e0d\u2026\u2026\u4f60\u4ec0\u4e48\u4e5f\u6ca1\u6709\u53d1\u73b0\u3002\u55ef\u3002","image":"ada"},
  {"achievement":10083,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u692d\u5706\u66f2\u7ebf\u5bc6\u7801\u7684\u6ce8\u91ca\u3002","image":"ada"},
  {"achievement":10090,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e5d\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10091,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u7279\u65af\u62c9\u8eab\u4efd\u4fe1\u606f\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10100,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10101,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u70ed\u529b\u5b66\u7b2c\u4e8c\u5b9a\u5f8b\u7684\u6ce8\u91ca\u3002","image":"schro"},
  {"achievement":10102,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u822c\u5ea6\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10103,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u201c\u7ec8\u6781\u7b54\u6848\u201d\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10110,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u4e00\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10111,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5e03\u9c81\u56fe\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10120,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u4e8c\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10121,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u4e39\u5c3c\u7537\u5b69\u300b\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10130,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u4e09\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10140,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u56db\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10141,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5929\u6d25\u56db\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10142,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u4ed9\u5973\u5ea7\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10143,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5317\u843d\u5e08\u95e8\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10150,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u4e94\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10151,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u672c\u4f53\u8bba\u7684\u6ce8\u91ca\u3002","image":"otto"},
  {"achievement":10152,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u9752\u5e74\u5728\u9009\u62e9\u804c\u4e1a\u65f6\u7684\u8003\u8651\u300b\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10160,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u516d\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10161,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u7f8e\u56fd\u72ec\u7acb\u5ba3\u8a00\u300b\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10162,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u5171\u4ea7\u515a\u5ba3\u8a00\u300b\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10170,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u4e03\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10171,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u5bbd\u5bb9\u300b\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10172,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u6ce2\u58eb\u987f\u5c60\u6740\u7684\u6ce8\u91ca\u3002","image":"ein"},
  {"achievement":10173,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5217\u514b\u661f\u6566\u548c\u5eb7\u79d1\u5fb7\u6218\u5f79\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10180,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u516b\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10181,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u52c3\u5170\u767b\u5821\u95e8\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10182,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u67cf\u6797\u5360\u9886\u533a\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10183,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u7f8e\u56fd1\u53f7\u56fd\u9053\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10190,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u5341\u4e5d\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10191,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u767d\u9cb8\u300b\u7684\u6ce8\u91ca\u3002","image":"reana"},
  {"achievement":10192,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u63d0\u5c14\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10200,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10201,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u571f\u8033\u5176\u72ec\u7acb\u6218\u4e89\u7684\u6ce8\u91ca\u3002","image":"reana"},
  {"achievement":10202,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u767e\u5c81\u5170\u7684\u6ce8\u91ca\u3002","image":"reana"},
  {"achievement":10203,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u4e9a\u745f\u738b\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10210,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u4e00\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10211,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u77f3\u70ad\u9178\u7684\u6ce8\u91ca\u3002","image":"reana"},
  {"achievement":10212,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u963f\u65af\u7279\u62c9\u7684\u6ce8\u91ca\u3002","image":"tesla"},
  {"achievement":10220,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u4e8c\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10221,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u65e5\u5185\u74e6\u5ba3\u8a00\u300b\u7684\u6ce8\u91ca\u3002","image":"normal"},
  {"achievement":10230,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u4e09\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10231,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u5341\u4e00\u7ef4\u65f6\u7a7a\u7684\u6ce8\u91ca\u3002","image":"nancy"},
  {"achievement":10240,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u56db\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10241,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u6a21\u62df\u4fe1\u53f7\u7684\u6ce8\u91ca\u3002","image":"ada"},
  {"achievement":10242,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u65af\u5361\u5e03\u7f57\u96c6\u5e02\u300b\u7684\u6ce8\u91ca\u3002","image":"nancy"},
  {"achievement":10250,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u4e94\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10251,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u89e3\u653e\u4e86\u7684\u666e\u7f57\u7c73\u4fee\u65af\u300b\u7684\u6ce8\u91ca\u3002","image":"welt"},
  {"achievement":10260,"text":"\u4f60\u9605\u8bfb\u4e86\u7b2c\u4e8c\u5341\u516d\u7ae0\u7684\u5267\u60c5\u3002","image":"normal"},
  {"achievement":10261,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u300a\u9ea6\u514b\u767d\u300b\u7684\u6ce8\u91ca\u3002","image":"otto"},
  {"achievement":10262,"text":"\u4f60\u53d1\u73b0\u4e86\u5173\u4e8e\u201c\u5fd2\u4fee\u65af\u4e4b\u8239\u201d\u7684\u6ce8\u91ca\u3002","image":"reana"}
];

var masterPortraits = [
  {name: "welt", index: 750}, {name: "nokia", index: 550}, {name: "schro", index: 555},
  {name: "nancy", index: 745}, {name: "ada", index: 550}, {name: "reanna", index: 545},
  {name: "ein", index: 749}, {name: "ha", index: 552}, {name: "fuhua", index: 746},
  {name: "tesla", index: 760}, {name: "otto", index: 750}, {name: "yang", index: 750}, {name: "plank", index: 549}
];

function getLocalAchievements() {
  var saved = localStorage.getItem('anti_entropy_achievements');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) { }
  }
  return [];
}

function saveLocalAchievement(ach_id) {
  var saved = getLocalAchievements();
  var id = Number(ach_id);
  if (saved.indexOf(id) === -1) {
    saved.push(id);
    localStorage.setItem('anti_entropy_achievements', JSON.stringify(saved));
  }
}

function post_achievement(str_ach, callbackOne, callbackTwo) {
  ajax_answer_achievement = null;

  // Имитация асинхронного вызова, чтобы сохранить оригинальный рабочий процесс
  setTimeout(function() {
    if (str_ach === 'LOAD') {
      var unlockedIds = getLocalAchievements();
      var unlockedAchievements = [];
      for (var i = 0; i < masterAchievementData.length; i++) {
        if (unlockedIds.indexOf(Number(masterAchievementData[i].achievement)) !== -1) {
          unlockedAchievements.push(masterAchievementData[i]);
        }
      }
      
      // Вычисляем процент открытия достижений
      var progress = masterAchievementData.length > 0 ? unlockedIds.length / masterAchievementData.length : 0;
      
      // Разблокируем персонажей галереи в соответствии с общим прогрессом достижений
      var portraitsToReturn = masterPortraits.slice(0, Math.ceil(progress * masterPortraits.length));

      ajax_answer_achievement = {
        retcode: 1,
        msg: "The achievement record has been loaded locally.",
        progress: progress.toString(),
        portrait: portraitsToReturn,
        achievement: unlockedAchievements
      };

      if (callbackOne) callbackOne();
    } else {
      if (str_ach) {
        saveLocalAchievement(str_ach);
      }
      ajax_answer_achievement = { retcode: 1, msg: "success locally" };
      if (callbackOne) callbackOne();
    }
  }, 0);
}

var achievement_result = null
var achievement_list = new Array()
var achievement_portraits = new Array()

function portraitPage(typeReturn) {
  startLoad()
  if (!typeReturn) {
    post_achievement(
      'LOAD',
      function () {
        achievement_result = ajax_answer_achievement
        portraitPage(10)
      },
      function () {
        achievement_result = ajax_answer_achievement
        portraitPage(10)
      }
    )
    return
  } else if (!achievement_result) {
    LoadFinish()
    alert(gameTips['link_error_tips'])
    $('#family-portrait').fadeOut()
    return
  }
  
  var retcode = achievement_result['retcode']
  if (retcode > 0) {
    var achievement_progress =
      parseInt(achievement_result['progress'] * 100) + '%'
    var achievement_progress_rem =
      achievement_result['progress'] * 28.55 + 'rem'
    var achievement_progress_text =
      achievement_result['progress'] * 28.55 + 1.3 + 0.5 + 'rem'
    var achievement_progress_text_r = 1.3 + 0.5 + 'rem'
    var achievement_progress_icon =
      achievement_result['progress'] * 28.55 - 1.3 + 'rem'
    achievement_list = achievement_result['achievement']
    achievement_portraits = achievement_result['portrait']
    // preload
    var achievementImageList = new Array()
    achievementImageList.push(
      'portraitBg.jpg',
      'sofaBack.png',
      'sofaFrontLeft.png',
      'sofaFrontRight.png',
      'barBottom.png',
      'barFrame.png',
      'barIcon.png',
      'barTop.png',
      'choice.png',
      'choice_b.png',
      'details.png',
      'exit.png',
      'leftPage.png',
      'listBG.jpg',
      'remark.png',
      'remark_b.png',
      'rightPage.png'
    )
    for (var i = 0; i < achievement_portraits.length; i++) {
      achievementImageList.push(achievement_portraits[i]['name'] + '.png')
    }
    achievementImageList.push('null_h.png')
    for (var j = 0; j < achievement_list.length; j++) {
      if (
        $.inArray(
          achievement_list[j]['image'] + '_h.png',
          achievementImageList
        ) < 0
      ) {
        achievementImageList.push(achievement_list[j]['image'] + '_h.png')
      }
    }
    preLoadUiImages('achievement', achievementImageList)
    // Проверка, завершилась ли загрузка предзагруженных изображений
    var countIndexTimer = 0
    var preLoadImagesTimer = setInterval(function () {
      if (preLoadImagesCheck() > 0 || countIndexTimer > 100) {
        // Изображения загружены, либо истекло время ожидания
        clearTimeout(preLoadImagesTimer)
        $('#family-portrait').addClass('family-portrait')
        $('#achievement-exhibition').addClass('achievement-exhibition')
        $('.portrait-wrapper#portrait-frame').html('')
        var pHtml = $('<div></div>')
        pHtml.addClass('portrait-wrapper')
        pHtml.css(
          'background-image',
          "url('" + base_url + "ru-RU/resources/achievement/sofaBack.png')"
        )
        pHtml.css('z-index', '600')
        $('.portrait-wrapper#portrait-frame').append(pHtml)
        pHtml = $('<div id="sofaFrontLeft"></div>')
        pHtml.addClass('portrait-wrapper')
        pHtml.css(
          'background-image',
          "url('" + base_url + "ru-RU/resources/achievement/sofaFrontLeft.png')"
        )
        pHtml.css('z-index', '700')
        $('.portrait-wrapper#portrait-frame').append(pHtml)
        pHtml = $('<div id="sofaFrontRight"></div>')
        pHtml.addClass('portrait-wrapper')
        pHtml.css(
          'background-image',
          "url('" + base_url + "ru-RU/resources/achievement/sofaFrontRight.png')"
        )
        pHtml.css('z-index', '700')
        $('.portrait-wrapper#portrait-frame').append(pHtml)

        for (var i = 0; i < achievement_portraits.length; i++) {
          pHtml = $('<div></div>')
          pHtml.addClass('portrait-wrapper')
          pHtml.css(
            'background-image',
            "url('" +
              base_url +
              'ru-RU/resources/achievement/' +
              achievement_portraits[i]['name'] +
              ".png')"
          )
          pHtml.css('z-index', achievement_portraits[i]['index'])
          $('.portrait-wrapper#portrait-frame').append(pHtml)
          if (achievement_portraits[i]['name'] == 'welt') {
            $('.portrait-wrapper#sofaFrontLeft').fadeOut()
          }
          if (achievement_portraits[i]['name'] == 'otto') {
            $('.portrait-wrapper#sofaFrontRight').fadeOut()
          }
        }
        $('.progress-span').css('width', achievement_progress_rem)
        $('.progress-icon').css('left', achievement_progress_icon)
        if (achievement_result['progress'] <= 0.8) {
          $('.progress-text').css('left', achievement_progress_text)
        } else {
          $('.progress-text').css('right', achievement_progress_text_r)
          $('.progress-text').css('color', '#5b4c51')
        }
        $('.progress-text').html(achievement_progress)
        $('.family-portrait').fadeIn()
        LoadFinish()
        return
      }
      countIndexTimer++
    }, 100)
  } else {
    LoadFinish()
    alert(gameTips['check_error_tips'])
    $('#family-portrait').fadeOut()
    return
  }
}

var exhibition_index = 10010
var exhibition_last = 10010
var exhibition_list = null

function exhibitionPage(page) {
  startLoad()
  if (page) {
    exhibition_index = Number(page)
  }
  var xmlDoc = loadExistXmlFile('exhibition_list', function () {
    var doc = xml_files_all_in_this['exhibition_list'];
    if (!doc || doc === "FAILED") { LoadFinish(); return; } // ИСПРАВЛЕНО
    exhibition_list = doc.getElementsByTagName('log')
    exhibitionPage(page)
  })
  if (!xmlDoc) return
  exhibition_last = Number(
    exhibition_list[exhibition_list.length - 1].getAttribute('id')
  )
  $('.pagenum#pagenum-5').removeClass('pagenum-gray')
  if (exhibition_index == 10010) {
    $('.pagenum#pagenum-5').addClass('pagenum-gray')
  }
  $('.pagenum#pagenum-6').removeClass('pagenum-gray')
  if (exhibition_index + 10 > exhibition_last) {
    $('.pagenum#pagenum-6').addClass('pagenum-gray')
  }
  var pHtml = $('<p></p>')
  pHtml.html('Chapter ' + (exhibition_index / 10 - 1000))
  pHtml.addClass('achievement-chapter-text')
  $('.achievement-chapter').html(pHtml)
  $('.achievement-list').html('')
  for (var i = 0; i < exhibition_list.length; i++) {
    var listId = Number(exhibition_list[i].getAttribute('id'))
    if (listId >= exhibition_index && listId < exhibition_index + 10) {
      var pHtml = $('<li></li>')
      var pHtml_box = $('<div></div>')
      var pHtml_pic = $('<div></div>')
      var pHtml_tip = $('<div></div>')
      var pHtml_tit = $('<p></p>')
      var pHtml_txt = $('<p></p>')
      pHtml_tit.html(exhibition_list[i].textContent)
      for (var j = 0; j < achievement_list.length; j++) {
        if (Number(achievement_list[j]['achievement']) == listId) {
          pHtml_txt.html(achievement_list[j]['text'])
          pHtml_pic.css(
            'background-image',
            "url('" +
              base_url +
              'ru-RU/resources/achievement/' +
              achievement_list[j]['image'] +
              "_h.png')"
          )
          if (exhibition_list[i].getAttribute('type') != 'end') {
            pHtml_tip.css(
              'background-image',
              "url('" +
                base_url +
                'ru-RU/resources/achievement/' +
                exhibition_list[i].getAttribute('type') +
                "_b.png')"
            )
          }
          break
        }
      }
      pHtml_pic.addClass('exhibition-member-image')
      pHtml_tit.addClass('exhibition-member-title')
      pHtml_tip.addClass('exhibition-member-tips')
      pHtml_txt.addClass('exhibition-member-text')
      if (j >= achievement_list.length) {
        pHtml_txt.html('？？？？？？？？？？？？？？？？？？？？')
        pHtml_txt.css('color', '#cccccc')
        pHtml_pic.css(
          'background-image',
          "url('" + base_url + "ru-RU/resources/achievement/null_h.png')"
        )
        if (exhibition_list[i].getAttribute('type') != 'end') {
          pHtml_tip.css(
            'background-image',
            "url('" +
              base_url +
              'ru-RU/resources/achievement/' +
              exhibition_list[i].getAttribute('type') +
              ".png')"
          )
        }
      }
      pHtml_box
        .append(pHtml_pic)
        .append(pHtml_tip)
        .append(pHtml_tit)
        .append(pHtml_txt)
      pHtml_box.addClass('exhibition-member')
      pHtml.append(pHtml_box)
      pHtml.addClass('achievement-list-member')
      $('.achievement-list').append(pHtml)
    }
  }
  $('.achievement-exhibition').fadeIn()
  LoadFinish()
}

$('.pagenum#pagenum-5').click(function () {
  if (exhibition_index > 10010) {
    exhibition_index -= 10
    exhibitionPage()
  }
})

$('.pagenum#pagenum-6').click(function () {
  if (exhibition_index + 10 <= exhibition_last) {
    exhibition_index += 10
    exhibitionPage()
  }
})
