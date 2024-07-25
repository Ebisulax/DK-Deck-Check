let cardList = [];

async function loadCardList() {
    try {
        const response = await fetch('dk_card_list.json');
        cardList = await response.json();
    } catch (error) {
        console.error('Error loading card list:', error);
    }
}

async function fetchDatabase() {
    try {
        const response = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching the database:', error);
        return [];
    }
}

async function uploadFile() {
    await loadCardList();

    const input = document.getElementById('fileInput');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const parser = new DOMParser();
                const xml = parser.parseFromString(event.target.result, "application/xml");

                // Get all card elements within the <main> part
                const mainElement = xml.getElementsByTagName('main')[0];
                if (!mainElement) {
                    console.error('No <main> element found in the uploaded file.');
                    return;
                }

                const mainCards = mainElement.getElementsByTagName('card');
                const database = await fetchDatabase();

                // Get the table body element
                const cardTableBody = document.getElementById('cardTable').querySelector('tbody');
                cardTableBody.innerHTML = ''; // Clear the table

                let totalAtk = 0;
                let count = 0;
                let highAtkCount = 0;
                let highAtkSum = 0;
                let midAtkCount = 0;
                let midAtkSum = 0;
                let value5Count = 0;
                let totalValueSum = 0;
                let invalidCards = [];

                // Loop through the cards and add their values to the list
                for (let i = 0; i < mainCards.length; i++) {
                    const cardName = mainCards[i].textContent.trim();
                    const tableRow = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    const atkCell = document.createElement('td');
                    const valueCell = document.createElement('td');
                    nameCell.textContent = cardName;

                    // Find match in database
                    const match = database.find(dbCard => dbCard.name === cardName);
                    const cardData = cardList.find(card => card.name === cardName);

                    if (match && typeof match.atk === 'number') {
                        const originalAtk = match.atk;
                        const level = match.level;

                        // Adjust ATK based on level for calculation purposes
                        let adjustedAtk = originalAtk;
                        if (level >= 5 && level <= 6) {
                            adjustedAtk = Math.max(adjustedAtk - 600, 0);
                        } else if (level >= 7) {
                            adjustedAtk = Math.max(adjustedAtk - 1000, 0);
                        }

                        atkCell.textContent = originalAtk;

                        // Include in average calculation
                        totalAtk += adjustedAtk;
                        count++;

                        if (level >= 1 && level <= 4) {
                            if (originalAtk >= 1700) {
                                highAtkCount++;
                                highAtkSum += originalAtk;
                            } else if (originalAtk >= 1500 && originalAtk <= 1650) {
                                midAtkCount++;
                                midAtkSum += originalAtk;
                            }
                        }

                        // Check if the card is in the allowed list
                        if (cardData) {
                            valueCell.textContent = cardData.value;
                            if (cardData.value === 5) {
                                value5Count++;
                            }
                            totalValueSum += cardData.value;
                        } else {
                            invalidCards.push(cardName);
                        }
                    } else {
                        atkCell.textContent = '';
                        valueCell.textContent = cardData ? cardData.value : '';
                        if (cardData) {
                            if (cardData.value === 5) {
                                value5Count++;
                            }
                            totalValueSum += cardData.value;
                        } else {
                            invalidCards.push(cardName);
                        }
                    }

                    tableRow.appendChild(nameCell);
                    tableRow.appendChild(atkCell);
                    tableRow.appendChild(valueCell);
                    cardTableBody.appendChild(tableRow);
                }

                // Calculate average ATK
                const avgAtk = count > 0 ? Math.ceil(totalAtk / count) : 0;
                const maxAvgAtk = 1200;
                const avgAtkDifference = maxAvgAtk * count - totalAtk;

                // Function to create a check or cross icon
                function createIcon(isCheck) {
                    const icon = document.createElement('img');
                    icon.src = isCheck ? 'https://img.icons8.com/color/48/000000/checkmark.png' : 'https://img.icons8.com/color/48/000000/cancel.png';
                    icon.alt = isCheck ? 'Check' : 'Cross';
                    icon.width = 24;
                    icon.height = 24;
                    return icon;
                }

                // Check rule 1
                const rule1Value = document.getElementById('avgAtkValue');
                const rule1Tip = document.getElementById('avgAtkTip');
                const rule1Result = document.getElementById('avgAtkResult');
                rule1Value.textContent = `${avgAtk}`;
                rule1Tip.textContent = `Deine Monster könnten noch ${avgAtkDifference} ATK mehr haben.`;
                rule1Result.innerHTML = '';
                rule1Result.appendChild(createIcon(avgAtk <= 1200));

                // Check rule 2
                const rule2Value = document.getElementById('highAtkCount');
                const rule2Sum = document.getElementById('highAtkSum');
                const rule2Tip = document.getElementById('highAtkTip');
                const rule2Result = document.getElementById('highAtkResult');
                rule2Value.textContent = `${highAtkCount}`;
                rule2Sum.textContent = `${highAtkSum}`;
                rule2Tip.textContent = `${highAtkCount < 2 ? `Du dürfest noch ${2 - highAtkCount} monster mehr im Deck haben. ` : ''} ${highAtkSum < 3650 ? `Sie dürften noch um ${3650 - highAtkSum} ATK stärker sein.` : ''}`;
                rule2Result.innerHTML = '';
                rule2Result.appendChild(createIcon(highAtkCount <= 2 && highAtkSum <= 3650));

                // Check rule 3
                const rule3Value = document.getElementById('midAtkCount');
                const rule3Sum = document.getElementById('midAtkSum');
                const rule3Tip = document.getElementById('midAtkTip');
                const rule3Result = document.getElementById('midAtkResult');
                rule3Value.textContent = `${midAtkCount}`;
                rule3Sum.textContent = `${midAtkSum}`;
                rule3Tip.textContent = `${midAtkCount < 3 ? `Du dürfest noch ${3 - midAtkCount} monster mehr im Deck haben. ` : ''} ${midAtkSum < 4700 ? `Sie dürften noch um ${4700 - midAtkSum} ATK stärker sein.` : ''}`;
                rule3Result.innerHTML = '';
                rule3Result.appendChild(createIcon(midAtkCount <= 3 && midAtkSum <= 4700));

                // Check rule 4
                const rule4Value = document.getElementById('allowedCardsValue');
                const rule4Tip = document.getElementById('allowedCardsTip');
                const rule4Result = document.getElementById('allowedCardsResult');
                rule4Value.textContent = invalidCards.length ? invalidCards.join(', ') : 'Alle Karten sind erlaubt';
                rule4Tip.textContent = invalidCards.length ? 'Einige Karten sind nicht erlaubt' : 'Alle Karten sind in der Liste der erlaubten Karten';
                rule4Result.innerHTML = '';
                rule4Result.appendChild(createIcon(invalidCards.length === 0));

                // Check rule 5
                const rule5Value = document.getElementById('value5Count');
                const rule5Tip = document.getElementById('value5Tip');
                const rule5Result = document.getElementById('value5Result');
                rule5Value.textContent = `${value5Count}`;
                rule5Tip.textContent = value5Count <= 3 ? `Du darfst noch ${3 - value5Count} limitierte Karten mehr spielen!` : `Du spielst ${value5Count - 3} limitierte Karten zu viel!`;
                rule5Result.innerHTML = '';
                rule5Result.appendChild(createIcon(value5Count <= 3));

                // Check rule 6
                const rule6Value = document.getElementById('totalValueSum');
                const rule6Tip = document.getElementById('totalValueTip');
                const rule6Result = document.getElementById('totalValueResult');
                rule6Value.textContent = `${totalValueSum}`;
                rule6Tip.textContent = totalValueSum <= 90 ? `Deine Karten dürften ${90 - totalValueSum} value mehr haben!` : `Deine Karten müssten ${totalValueSum - 90} value weniger haben!`;
                rule6Result.innerHTML = '';
                rule6Result.appendChild(createIcon(totalValueSum <= 90));

                // Make the tables visible
                document.getElementById('cardList').classList.remove('hidden');
                document.getElementById('ruleCheck').classList.remove('hidden');
            } catch (error) {
                console.error('Error parsing XML:', error);
            }
        };
        reader.readAsText(file);
    } else {
        console.error('No file selected');
    }
}
