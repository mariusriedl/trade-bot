// ==UserScript==
// @name         trade-bot
// @namespace    https://www.csgoroll.gg/*
// @version      0.1
// @description  try to take over the world!
// @author       Coffee
// @match        https://www.csgoroll.gg/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=csgoroll.com
// @grant        none
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==
/* global $ */

$(document).ready(function () {
  /*  $(this).on("DOMNodeInserted", function(e) {
        if(e.target != null && e.target.outerHTML != null && e.target.outerHTML.indexOf("<iframe") >= 0){
            if($(e.target).attr("title") == "reCAPTCHA") {
                console.log(e.target);
                captchaKey = $(e.target).attr("src").split("&k=")[1].split("&")[0];
                console.log(captchaKey);
            }
        }
    });*/

  var bot = false;
  var attached = false;
  var canWithdraw = true;

  var withdrawInterval = 10000; //300000 * 3;
  var maxPercent = 6.0;

  var minPrice = 5.0;

  var maxPrice = 100.0;

  var withdrawTimestamp;

  //max amount of retries to withdraw / click captcha
  var maxLoop = 50;

  //vorsichtig
  var captchaSolveLoopMax = 3;

  var solveCaptchaInitialDelay = 5000;

  var clickCaptchaInitialDelay = 200;

  function isSKin(text) {
    if (text.indexOf("Factory New") > 0) return true;
    if (text.indexOf("Field-Tested") > 0) return true;
    if (text.indexOf("Minimal Wear") > 0) return true;
    if (text.indexOf("Well-Worn") > 0) return true;
    if (text.indexOf("Battle-Scarred") > 0) return true;
    return false;
  }

  function doItemInspection(e) {
    if ($(e.target).parent().hasClass("grid") && $(e.target).is("div")) {
      setTimeout(function () {
        var card = $(e.target);
        var value = $(card).find(".currency-value").text().replace(",", "");
        var pDiff = $(card).find(".positive-difference").text();
        var nDiff = $(card).find(".negative-difference").text();
        var diff = 0;

        if (pDiff != null && pDiff != "") {
          diff = parseFloat(pDiff.split("%")[0]);
        } else if (nDiff != null && nDiff != "") {
          diff = parseFloat(nDiff.split("%")[0].replace("+", ""));
        }

        var isSKinn = isSKin(
          $(card).find("div.variant-text.ng-star-inserted").text()
        );
        var isSouvenier = $(card).html().indexOf("Souvenir") > 0;

        console.log(
          "value: " +
            value +
            " value in range: " +
            (value > minPrice && value <= getBalance()) +
            " is souvenier: " +
            isSouvenier +
            " is skin: " +
            isSKinn +
            " is within percent margin: " +
            (diff < maxPercent)
        );

        if (
          value >= minPrice &&
          value <= maxPrice &&
          value <= getBalance() &&
          canWithdraw &&
          !isSouvenier &&
          isSKinn &&
          bot &&
          diff <
            maxPercent /* && $(".cdk-overlay-backdrop.cdk-overlay-dark-backdrop.cdk-overlay-backdrop-showing").length == 0*/
        ) {
          canWithdraw = false;
          $(card).find(".select-ripple-wrapper").click();
          var withdrawLoop = 0;
          function clickWithdraw() {
            console.log("trying to click withdraw");
            if (
              $(
                ".mat-focus-indicator.w-100.mat-button-3d.mat-button-lg.mat-flat-button.mat-button-base.mat-accent"
              ).length > 0
            ) {
              $(
                ".mat-focus-indicator.w-100.mat-button-3d.mat-button-lg.mat-flat-button.mat-button-base.mat-accent"
              )[0].click();

              var captchaLoop = 0;
              function clickCaptcha() {
                if (
                  $(".cdk-overlay-container iframe[title='reCAPTCHA']").length >
                  0
                ) {
                  console.log("bin drin");
                  setTimeout(function () {
                    $.ajax({
                      type: "POST",
                      url: "http://localhost:8080/click-captcha",
                      crossDomain: true,
                      contentType: "application/json; charset=utf-8",
                      dataType: "json",
                    }).done(function () {
                      withdrawTimestamp = Date.now();
                      var captchaSolverLoop = 0;

                      function solveCaptcha() {
                        if (
                          $(".captcha-solver.captcha-solver_inner").length > 0
                        ) {
                          $(".captcha-solver.captcha-solver_inner")
                            .first()
                            .click();
                        } else {
                          captchaSolverLoop++;
                          if (captchaSolverLoop < captchaSolveLoopMax) {
                            setTimeout(function () {
                              solveCaptcha();
                            }, 500);
                          }
                        }
                      }

                      setTimeout(function () {
                        solveCaptcha();
                      }, solveCaptchaInitialDelay);

                      var myInterval = setInterval(function () {
                        var timeUntilWithdraw =
                          withdrawTimestamp + withdrawInterval - Date.now();
                        timeUntilWithdraw = timeUntilWithdraw / 1000;
                        $("#rollscript-trigger").html(
                          Math.round(timeUntilWithdraw)
                        );
                      }, 1000);
                      setTimeout(function () {
                        clearInterval(myInterval);
                        $("#rollscript-trigger").html("");
                        canWithdraw = true;
                        location.reload();
                      }, withdrawInterval);
                    });
                  }, clickCaptchaInitialDelay);
                } else {
                  captchaLoop++;
                  if (captchaLoop < maxLoop) {
                    setTimeout(function () {
                      clickCaptcha();
                    }, 100);
                  } else {
                    canWithdraw = true;
                  }
                }
              }
              clickCaptcha();
            } else {
              withdrawLoop++;
              if (withdrawLoop < maxLoop) {
                setTimeout(function () {
                  clickWithdraw();
                }, 100);
              } else {
                canWithdraw = true;
              }
            }
          }
          setTimeout(function () {
            clickWithdraw();
          }, 50);
        }

        var possibleWin = (parseFloat(value) / (100 + diff)) * 112 - value;

        possibleWin = Math.round(possibleWin * 100) / 100;
        if ($(card).find("cw-pretty-balance .max-profit-margin").length > 0) {
          $(card)
            .find("cw-pretty-balance .max-profit-margin")
            .each(function () {
              $(this).remove();
            });
        }
        $(card)
          .find("cw-pretty-balance")
          .append(
            "<br><span class='max-profit-margin' style='margin-left: 10px;    position: absolute;    margin-top: 1px;    color: #00e258;'>" +
              possibleWin +
              "</span>"
          );
      }, 1);
    }
  }

  function getBalance() {
    return parseFloat(
      $(".user-balance .currency-value").first().text().replace(",", "")
    );
  }

  function setupScript() {
    setTimeout(function () {
      var balance = getBalance();
      $("input[formcontrolname='minValue'").val(minPrice);
      $("input[formcontrolname='maxValue'").val(Math.min(maxPrice, balance));
      $("*[formcontrolname='orderBy']").first().click();
      setTimeout(function () {
        $("span:contains('Best deals')").click();
        setTimeout(function () {
          $("#rollscript-trigger").click();
        }, 2000);
      }, 200);
    }, 2000);
  }

  function foo() {
    if (
      document.getElementsByTagName("html")[0].getAttribute("style") != null
    ) {
      $("body").append(
        "<div id='rollscript-trigger' style='color: black; font-size: 18px; line-height: 56px; text-align: center; cursor: pointer; position: fixed; z-index:99999999999999999999999999999999999; box-shadow:0 3px 5px -1px #0003, 0 6px 10px #00000024, 0 1px 18px #0000001f; bottom: 3rem; right: 8rem; height: 56px; width: 56px; border-radius: 50%; background-color: #ff5548;'></div>"
      );
      //$("body").append("<div id='rollscript-attach' style='cursor: pointer; position: fixed; z-index:99999999999999999999999999999999999; box-shadow:0 3px 5px -1px #0003, 0 6px 10px #00000024, 0 1px 18px #0000001f; bottom: 3rem; right: 13rem; height: 56px; width: 56px; border-radius: 50%; background-color: blue;'></div>");
      $("#rollscript-trigger").click(function () {
        bot = !bot;
        if (bot) {
          $("#rollscript-trigger").css("background-color", "#00c74d");
          var parent = $("cw-withdraw-search-grid")
            .children()
            .last()
            .children()
            .first();
          if (parent.length > 0) {
            $(parent).children().first().trigger("DOMNodeInserted");
          }
        } else {
          $("#rollscript-trigger").css("background-color", "#ff5548");
        }
      });
      /*$("#rollscript-attach").click(function() {
                if(!attached) {
                    attach();
                } else {
                    alert("already attached");
                }
            });*/
      console.log("csgoroll trade tools initialized");
      attach();
      function attach() {
        console.log("attach called");
        setupScript();
        var parent = $("cw-withdraw-search-grid")
          .children()
          .last()
          .children()
          .first();
        if (parent.length > 0) {
          attached = true;
          $(parent).on("DOMNodeInserted", function (e) {
            if ($(e.target).parent().hasClass("grid")) {
              doItemInspection(e);
            }
          });
        }
      }
    }
  }

  setTimeout(function () {
    foo();
  }, 2000);
});
