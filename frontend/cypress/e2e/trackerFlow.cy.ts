describe('tracker flow scenario', () => {
  const prepareAuthenticatedVisit = (path: string) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('isAuthenticated', 'true');
        win.localStorage.removeItem('trackingSessionState');
      },
    });
  };

  it('moves through survey → consent → tracker → training → results', () => {
    prepareAuthenticatedVisit('/onboarding/survey');

    cy.contains('Q1').find('input[type="checkbox"]').check({ force: true });
    cy.contains('Q2').find('input[type="checkbox"]').check({ force: true });
    cy.contains('button', 'Valorant').click();
    cy.get('input[type="radio"][value="Valorant"]').check({ force: true });
    cy.get('input[name="inGameRank"]').type('Immortal 1');
    cy.get('select[name="playTime"]').select('500-1000시간');
    cy.get('input[name="selfAssessment"]').invoke('val', 6).trigger('input');
    cy.contains('button', '설문 제출 및 다음 단계로').click();

    cy.url().should('include', '/tracker-flow');
    cy.contains('article.flow-card', '연구 동의서').within(() => {
      cy.contains('button', '동의하기').click();
    });

    cy.url().should('include', '/tracker-app');
    cy.contains('label', '연구 목적 및 개인정보 처리에 동의합니다.').find('input').check({ force: true });
    cy.contains('button', 'Go to tracker flow').click();

    cy.url().should('include', '/tracker-flow');

    cy.window().then(win => {
      const stored = JSON.parse(win.localStorage.getItem('trackingSessionState') ?? '{}');
      stored.calibrationResult = {
        status: 'validated',
        validationError: 3,
        completedAt: new Date().toISOString(),
      };
      win.localStorage.setItem('trackingSessionState', JSON.stringify(stored));
    });

    cy.visit('/tracker-flow');
    cy.contains('article.flow-card', '트레이닝 세션').within(() => {
      cy.contains('button', '트레이닝 실행').click();
    });

    cy.url().should('include', '/training');
    cy.contains('Ready to Train?').should('be.visible');

    cy.window().then(win => {
      const stored = JSON.parse(win.localStorage.getItem('trackingSessionState') ?? '{}');
      const session = {
        id: 'cypress-session',
        date: new Date().toISOString(),
        duration: 60,
        score: 42,
        accuracy: 88,
        targetsHit: 40,
        totalTargets: 50,
        avgReactionTime: 240,
        gazeAccuracy: 80,
        mouseAccuracy: 92,
        csvData: 'timestamp,gazeX',
        rawData: [
          {
            timestamp: 100,
            gazeX: 10,
            gazeY: 20,
            mouseX: 30,
            mouseY: 40,
            targetHit: true,
            targetId: 't1',
          },
          {
            timestamp: 200,
            gazeX: 15,
            gazeY: 25,
            mouseX: 35,
            mouseY: 45,
            targetHit: false,
            targetId: 't2',
          },
        ],
      };
      stored.recentSessions = [session];
      stored.lastSession = session;
      stored.activeSessionId = session.id;
      win.localStorage.setItem('trackingSessionState', JSON.stringify(stored));
    });

    cy.visit('/results');
    cy.contains('Training Results').should('be.visible');
    cy.contains('Performance Overview').should('be.visible');
  });
});
